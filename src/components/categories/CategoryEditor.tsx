import { useCallback, useState } from 'react';
import {
  useCreateCategory,
  useCustomizeSystemCategory,
  useUpdateCategory,
} from '@/api/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_NAME_MIN_LENGTH,
  CATEGORY_TYPE_VALUES,
  type CategoryType,
} from '@/types/category.types';
import { CategoryIcon } from './CategoryIcon';
import {
  CATEGORY_TYPE_ICON,
  CATEGORY_TYPE_LABEL,
} from './category-meta';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';

export type CategoryEditorMode =
  /** Fully-custom category creation. */
  | { kind: 'create'; defaultType: CategoryType }
  /** Update an already instantiated row. */
  | {
      kind: 'edit';
      categoryId: number;
      type: CategoryType;
      initial: { name: string; icon: string | null; color: string | null };
    }
  /** Lazy-customize a system default that has not been instantiated yet. */
  | {
      kind: 'customize';
      systemCategoryId: number;
      type: CategoryType;
      initial: { name: string; icon: string | null; color: string | null };
    };

interface CategoryEditorProps {
  mode: CategoryEditorMode;
  onClose: () => void;
}

export function CategoryEditor({
  mode,
  onClose,
}: CategoryEditorProps): React.ReactElement {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const customize = useCustomizeSystemCategory();

  const initialName = mode.kind === 'create' ? '' : mode.initial.name;
  const initialIcon = mode.kind === 'create' ? null : mode.initial.icon;
  const initialColor = mode.kind === 'create' ? null : mode.initial.color;
  const initialType =
    mode.kind === 'create' ? mode.defaultType : mode.type;

  const [name, setName] = useState<string>(initialName);
  const [type, setType] = useState<CategoryType>(initialType);
  const [icon, setIcon] = useState<string | null>(initialIcon);
  const [color, setColor] = useState<string | null>(initialColor);

  const trimmedName = name.trim();
  const isNameValid =
    trimmedName.length >= CATEGORY_NAME_MIN_LENGTH &&
    trimmedName.length <= CATEGORY_NAME_MAX_LENGTH;

  const dirty =
    mode.kind === 'create'
      ? isNameValid
      : trimmedName !== mode.initial.name ||
        icon !== mode.initial.icon ||
        color !== mode.initial.color;

  const pending =
    create.isPending || update.isPending || customize.isPending;
  const error = create.error ?? update.error ?? customize.error;

  const submit = useCallback((): void => {
    if (!isNameValid || !dirty || pending) return;

    if (mode.kind === 'create') {
      create.mutate(
        {
          name: trimmedName,
          type,
          icon: icon ?? undefined,
          color: color ?? undefined,
        },
        {
          onSuccess: () => {
            tgHapticNotify('success');
            onClose();
          },
          onError: () => tgHapticNotify('error'),
        },
      );
      return;
    }

    const body = {
      ...(trimmedName !== mode.initial.name ? { name: trimmedName } : {}),
      ...(icon !== mode.initial.icon ? { icon: icon ?? '' } : {}),
      ...(color !== mode.initial.color ? { color: color ?? '' } : {}),
    };

    if (mode.kind === 'edit') {
      update.mutate(
        { id: mode.categoryId, body },
        {
          onSuccess: () => {
            tgHapticNotify('success');
            onClose();
          },
          onError: () => tgHapticNotify('error'),
        },
      );
    } else {
      customize.mutate(
        { systemCategoryId: mode.systemCategoryId, body },
        {
          onSuccess: () => {
            tgHapticNotify('success');
            onClose();
          },
          onError: () => tgHapticNotify('error'),
        },
      );
    }
  }, [
    mode,
    isNameValid,
    dirty,
    pending,
    trimmedName,
    type,
    icon,
    color,
    create,
    update,
    customize,
    onClose,
  ]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-3">
        <CategoryIcon
          icon={icon}
          color={color}
          fallbackText={trimmedName || initialName}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium">
            {trimmedName || 'Yangi kategoriya'}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {CATEGORY_TYPE_LABEL[type]}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category-name">Nom</Label>
        <Input
          id="category-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Marketing"
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          required
          autoFocus
        />
      </div>

      {mode.kind === 'create' ? (
        <div className="space-y-1.5">
          <Label>Turi</Label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_TYPE_VALUES.map((t) => {
              const Icon = CATEGORY_TYPE_ICON[t];
              const selected = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    tgHapticImpact('light');
                    setType(t);
                  }}
                  className={`press flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[13px] ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{CATEGORY_TYPE_LABEL[t]}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label>Rang</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="space-y-1.5">
        <Label>Belgi</Label>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      {error ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isNameValid || !dirty || pending}
      >
        {pending ? <Spinner /> : null}
        Saqlash
      </Button>
    </form>
  );
}
