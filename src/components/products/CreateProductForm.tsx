import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/api/hooks/use-categories';
import { useCreateProduct } from '@/api/hooks/use-products';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import { UnitPicker } from '@/components/products/UnitPicker';
import { SelectField } from '@/components/transactions/forms/form-primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { ACCOUNT_CURRENCY_VALUES } from '@/types/account.types';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  DEFAULT_UNIT_OF_MEASURE,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  type UnitOfMeasure,
} from '@/types/product.types';
import type { AccountCurrency } from '@/types/account.types';

interface CreateProductFormProps {
  onClose: () => void;
}

interface CategoryOption {
  /** Stable key for the SelectField (kind:id). */
  key: string;
  /** Either an instantiated tenant row id, or null when only system. */
  categoryId: number | null;
  /** System category id when this row links to one (system default or system-linked). */
  systemCategoryId: number | null;
  name: string;
  icon: string | null;
  color: string | null;
}

export function CreateProductForm({
  onClose,
}: CreateProductFormProps): React.ReactElement {
  const { t } = useTranslation();
  const create = useCreateProduct();
  // Pickers need the full catalog in one shot. The backend exposes `all=true`
  // to bypass pagination so the picker never misses options.
  const categories = useCategories({ type: 'product', all: true });

  const [name, setName] = useState<string>('');
  const [categoryKey, setCategoryKey] = useState<string>('');
  const [currency, setCurrency] = useState<AccountCurrency>('UZS');
  const [productType, setProductType] = useState<'product' | 'service'>(
    'product',
  );
  const [unit, setUnit] = useState<UnitOfMeasure>(DEFAULT_UNIT_OF_MEASURE);

  const trimmedName = name.trim();
  const isNameValid =
    trimmedName.length >= PRODUCT_NAME_MIN_LENGTH &&
    trimmedName.length <= PRODUCT_NAME_MAX_LENGTH;

  const options = useMemo<CategoryOption[]>(() => {
    return (categories.data?.data ?? [])
      .filter((c) => c.type === 'product' && !c.isArchived)
      .map((c) => {
        const key =
          c.id !== null ? `id:${c.id}` : `sys:${c.systemCategoryId ?? 'x'}`;
        return {
          key,
          categoryId: c.id,
          systemCategoryId: c.systemCategoryId,
          name: c.name,
          icon: c.icon,
          color: c.color,
        };
      });
  }, [categories.data]);

  const selected = options.find((o) => o.key === categoryKey) ?? null;
  const isCategoryValid = selected !== null;
  const isValid = isNameValid && isCategoryValid;

  const submit = useCallback((): void => {
    if (!isValid || !selected) return;
    create.mutate(
      {
        name: trimmedName,
        currency,
        ...(selected.categoryId !== null
          ? { categoryId: selected.categoryId }
          : selected.systemCategoryId !== null
            ? { systemCategoryId: selected.systemCategoryId }
            : {}),
        currentStock: productType === 'product' ? '0' : null,
        unit,
      },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [
    create,
    isValid,
    selected,
    trimmedName,
    currency,
    productType,
    unit,
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
      <div className="space-y-1.5">
        <Label htmlFor="product-name">{t('create_product.name')}</Label>
        <Input
          id="product-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('create_product.name_placeholder')}
          maxLength={PRODUCT_NAME_MAX_LENGTH}
          required
          autoFocus
        />
      </div>

      {categories.isPending ? (
        <div className="space-y-1.5">
          <Label>{t('create_product.category')}</Label>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Spinner /> {t('create_product.loading')}
          </div>
        </div>
      ) : options.length > 0 ? (
        <SelectField<string>
          id="product-category"
          label={t('create_product.category')}
          value={categoryKey === '' ? null : categoryKey}
          onChange={(next) => setCategoryKey(next ?? '')}
          options={options.map((o) => ({
            value: o.key,
            label: o.name,
            iconNode: (
              <CategoryIcon icon={o.icon} color={o.color} fallbackText={o.name} />
            ),
          }))}
          clearable
        />
      ) : (
        <div className="space-y-1.5">
          <Label>{t('create_product.category')}</Label>
          <p className="text-[12px] text-muted-foreground">
            {t('create_product.no_categories')}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>{t('create_product.currency')}</Label>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_CURRENCY_VALUES.map((c) => {
            const selectedCurrency = currency === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  tgHapticImpact('light');
                  setCurrency(c);
                }}
                className={`press min-w-[64px] rounded-xl border px-3 py-2 text-[14px] font-medium ${
                  selectedCurrency
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('create_product.product_type')}</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['product', 'service'] as const).map((kind) => {
            const active = productType === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  tgHapticImpact('light');
                  setProductType(kind);
                }}
                className={`press rounded-xl border px-3 py-2 text-[14px] font-medium ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                {t(
                  kind === 'product'
                    ? 'create_product.type_product'
                    : 'create_product.type_service',
                )}
              </button>
            );
          })}
        </div>
      </div>

      <UnitPicker value={unit} onChange={setUnit} />

      {create.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(create.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isValid || create.isPending}
      >
        {create.isPending ? <Spinner /> : null}
        {t('common.save')}
      </Button>
    </form>
  );
}
