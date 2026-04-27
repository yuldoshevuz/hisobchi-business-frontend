import { useMemo, useState } from 'react';
import { Archive, FolderTree, Plus, RotateCcw } from 'lucide-react';
import {
  useCategories,
  useCategoriesInfinite,
  useCustomizeSystemCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/api/hooks/use-categories';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import {
  CATEGORY_TYPE_ICON,
  CATEGORY_TYPE_LABEL,
} from '@/components/categories/category-meta';
import {
  CategoryEditor,
  type CategoryEditorMode,
} from '@/components/categories/CategoryEditor';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import {
  useInfiniteScroll,
  useViewportPageSize,
} from '@/hooks/use-infinite-scroll';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { PermissionSlug } from '@/lib/permission-slugs';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  CATEGORY_TYPE_VALUES,
  type CategoryType,
  type MergedCategory,
} from '@/types/category.types';

export function CategoriesPage(): React.ReactElement {
  const { isReady } = usePermissions();
  const canManage = useCan(PermissionSlug.CATEGORIES_MANAGE);
  const [activeType, setActiveType] = useState<CategoryType>('EXPENSE');
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState<CategoryEditorMode | null>(null);
  const [actionItem, setActionItem] = useState<MergedCategory | null>(null);

  // Initial page size scales with the user's viewport — fill the visible
  // area in one fetch instead of leaving empty whitespace under a short
  // response. ~64px per ListItem.
  const pageSize = useViewportPageSize(64);

  // Active list: infinite-paginated per type tab. Each tab maintains its own
  // query cache, so switching tabs keeps already-loaded pages.
  const categories = useCategoriesInfinite(
    { type: activeType, includeArchived: false, limit: pageSize },
    { enabled: canManage },
  );

  const sentinelRef = useInfiniteScroll({
    hasNextPage: categories.hasNextPage,
    isFetchingNextPage: categories.isFetchingNextPage,
    fetchNextPage: categories.fetchNextPage,
  });

  // Archive sub-view fetches a single page with high limit; archived sets are
  // typically small, so pagination is overkill and a flat list is cleaner.
  const archivedQuery = useCategories(
    { includeArchived: true, limit: 100 },
    { enabled: canManage && archiveOpen },
  );

  const sortedActive = useMemo(() => {
    const flat = (categories.data?.pages ?? []).flatMap((p) => p.data);
    return [...flat].sort((a, b) => {
      if (a.isCustom !== b.isCustom) return a.isCustom ? 1 : -1;
      const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
  }, [categories.data]);

  const archived = useMemo(
    () => (archivedQuery.data?.data ?? []).filter((c) => c.isArchived),
    [archivedQuery.data],
  );

  if (isReady && !canManage) {
    return (
      <AccessDeniedView
        title="Kategoriyalar"
        description="Bu bo‘limga kirish uchun ruxsat yo‘q"
        hint="Kategoriyalarni boshqarish uchun 'categories.manage' ruxsati kerak."
      />
    );
  }

  function openActions(item: MergedCategory): void {
    tgHapticImpact('light');
    setActionItem(item);
  }

  function openCreate(): void {
    tgHapticImpact('light');
    setEditorMode({ kind: 'create', defaultType: activeType });
  }

  function openEditor(target: MergedCategory): void {
    if (target.id !== null) {
      setEditorMode({
        kind: 'edit',
        categoryId: target.id,
        type: target.type,
        initial: {
          name: target.name,
          icon: target.icon,
          color: target.color,
        },
      });
    } else if (target.systemCategoryId !== null) {
      setEditorMode({
        kind: 'customize',
        systemCategoryId: target.systemCategoryId,
        type: target.type,
        initial: {
          name: target.name,
          icon: target.icon,
          color: target.color,
        },
      });
    }
  }

  return (
    <div className="pb-32">
      <PageHeader
        title="Kategoriyalar"
        description="Chiqim, kirim va mahsulot turlari"
        large
      />

      <div className="space-y-3">
        <div className="px-4">
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_TYPE_VALUES.map((t) => {
              const Icon = CATEGORY_TYPE_ICON[t];
              const selected = activeType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    tgHapticImpact('light');
                    setActiveType(t);
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

        {categories.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : categories.isError ? (
          <Section>
            <ListItem
              asStatic
              title={
                <span className="text-destructive">
                  {getApiErrorMessage(categories.error)}
                </span>
              }
            />
          </Section>
        ) : sortedActive.length > 0 ? (
          <>
            <Section title={CATEGORY_TYPE_LABEL[activeType]}>
              {sortedActive.map((c) => (
                <CategoryRow
                  key={
                    c.id !== null
                      ? `id-${c.id}`
                      : `sys-${c.systemCategoryId ?? 'x'}`
                  }
                  category={c}
                  onTap={() => openActions(c)}
                />
              ))}
            </Section>
            {categories.hasNextPage ? (
              <div
                ref={sentinelRef}
                className="flex justify-center py-4"
                aria-hidden="true"
              >
                {categories.isFetchingNextPage ? <Spinner /> : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className="px-6 py-12 text-center">
            <FolderTree className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-[14px] text-muted-foreground">
              {CATEGORY_TYPE_LABEL[activeType]} kategoriyalari yo‘q
            </p>
          </div>
        )}

        <Section>
          <ListItem
            showChevron
            onClick={() => {
              tgHapticImpact('light');
              setArchiveOpen(true);
            }}
            leading={
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Archive className="h-4 w-4" />
              </div>
            }
            title="Arxiv"
            subtitle="Arxivlangan kategoriyalar"
          />
        </Section>
      </div>

      <ScreenAction>
        <Button size="xl" onClick={openCreate}>
          <Plus className="h-5 w-5" />
          Yangi maxsus kategoriya
        </Button>
      </ScreenAction>

      <Modal
        open={Boolean(actionItem)}
        onOpenChange={(o) => {
          if (!o) setActionItem(null);
        }}
        title={actionItem?.name}
        description={
          actionItem ? CATEGORY_TYPE_LABEL[actionItem.type] : undefined
        }
      >
        {actionItem ? (
          <CategoryActions
            item={actionItem}
            onClose={() => setActionItem(null)}
            onEdit={() => {
              const target = actionItem;
              setActionItem(null);
              openEditor(target);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={editorMode !== null}
        onOpenChange={(o) => {
          if (!o) setEditorMode(null);
        }}
        title={
          editorMode?.kind === 'create'
            ? 'Yangi kategoriya'
            : editorMode?.kind === 'customize'
              ? 'Tizim kategoriyasini sozlash'
              : 'Kategoriyani tahrirlash'
        }
        description={
          editorMode && editorMode.kind !== 'create'
            ? CATEGORY_TYPE_LABEL[editorMode.type]
            : undefined
        }
      >
        {editorMode ? (
          <CategoryEditor
            mode={editorMode}
            onClose={() => setEditorMode(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Arxiv"
        description={
          archivedQuery.isPending
            ? undefined
            : `${archived.length} ta arxivlangan kategoriya`
        }
      >
        {archivedQuery.isPending ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : archived.length > 0 ? (
          <div className="-mx-4 divide-y divide-border bg-card">
            {archived.map((c) => (
              <ArchivedCategoryRow
                key={`archived-${c.id ?? c.systemCategoryId ?? 'x'}`}
                category={c}
                onTap={() => {
                  setArchiveOpen(false);
                  openActions(c);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-[14px] text-muted-foreground">
            Arxivlangan kategoriyalar yo‘q
          </div>
        )}
      </Modal>
    </div>
  );
}

interface CategoryRowProps {
  category: MergedCategory;
  onTap: () => void;
}

function CategoryRow({ category, onTap }: CategoryRowProps): React.ReactElement {
  return (
    <ListItem
      onClick={onTap}
      showChevron
      leading={
        <CategoryIcon
          icon={category.icon}
          color={category.color}
          fallbackText={category.name}
        />
      }
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{category.name}</span>
          {category.isCustom ? (
            <Badge variant="outline" className="text-[10px]">
              maxsus
            </Badge>
          ) : null}
          {category.isCustomized ? (
            <Badge variant="secondary" className="text-[10px]">
              moslashtirilgan
            </Badge>
          ) : null}
        </span>
      }
    />
  );
}

function ArchivedCategoryRow({
  category,
  onTap,
}: CategoryRowProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onTap}
      className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent"
    >
      <CategoryIcon
        icon={category.icon}
        color={category.color}
        fallbackText={category.name}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-medium">
            {category.name}
          </span>
          {category.isCustom ? (
            <Badge variant="outline" className="text-[10px]">
              maxsus
            </Badge>
          ) : null}
        </div>
        <div className="text-[12px] text-muted-foreground">
          {CATEGORY_TYPE_LABEL[category.type]}
        </div>
      </div>
    </button>
  );
}

interface CategoryActionsProps {
  item: MergedCategory;
  onClose: () => void;
  onEdit: () => void;
}

function CategoryActions({
  item,
  onClose,
  onEdit,
}: CategoryActionsProps): React.ReactElement {
  const update = useUpdateCategory();
  const customize = useCustomizeSystemCategory();
  const remove = useDeleteCategory();

  const isInstantiated = item.id !== null;
  const isSystemLinked = item.systemCategoryId !== null;
  // Archive: directly for instantiated rows, or via lazy customize for
  // system defaults that have not been materialised yet.
  const canArchive =
    !item.isArchived && (isInstantiated || isSystemLinked);
  const canRestore = isInstantiated && item.isArchived;
  const canResetToDefault =
    isInstantiated && isSystemLinked && item.isCustomized && !item.isArchived;
  // Hard-delete is only meaningful for fully-custom rows. Backend rejects when
  // the category is referenced by any active transaction / product / scheduled
  // entry, so the action is offered with that caveat in the subtitle.
  const canDelete = isInstantiated && item.isCustom;

  const pending =
    update.isPending || customize.isPending || remove.isPending;
  const error = update.error ?? customize.error ?? remove.error;

  function handleArchive(): void {
    tgHapticImpact('medium');
    if (item.id !== null) {
      update.mutate(
        { id: item.id, body: { isArchived: true } },
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
    if (item.systemCategoryId === null) return;
    customize.mutate(
      {
        systemCategoryId: item.systemCategoryId,
        body: { isArchived: true },
      },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }

  function handleRestore(): void {
    if (item.id === null) return;
    tgHapticImpact('medium');
    update.mutate(
      { id: item.id, body: { isArchived: false } },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }

  function handleDelete(): void {
    if (item.id === null) return;
    if (
      !confirm(
        `${item.name} kategoriyasini butunlay o‘chirishni tasdiqlaysizmi?`,
      )
    )
      return;
    tgHapticImpact('heavy');
    remove.mutate(item.id, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  return (
    <div className="space-y-3">
      <div className="-mx-4 divide-y divide-border bg-card">
        {!item.isArchived ? (
          <ActionRow
            title={isInstantiated ? 'Tahrirlash' : 'Sozlash'}
            subtitle="Nom, rang yoki belgini o‘zgartirish"
            onClick={onEdit}
          />
        ) : null}
        {canArchive ? (
          <ActionRow
            title="Arxivlash"
            subtitle="Yangi yozuvlarda yashiradi, tarix saqlanadi"
            onClick={handleArchive}
            loading={pending}
            icon={<Archive className="h-4 w-4 text-muted-foreground" />}
          />
        ) : null}
        {canRestore ? (
          <ActionRow
            title="Arxivdan tiklash"
            subtitle="Kategoriya yana faol bo‘ladi"
            onClick={handleRestore}
            loading={pending}
            icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
          />
        ) : null}
        {canResetToDefault ? (
          <ResetToDefaultRow
            categoryId={item.id as number}
            onSuccess={onClose}
          />
        ) : null}
        {canDelete ? (
          <ActionRow
            title="O‘chirish"
            subtitle="Faqat ishlatilmagan maxsus kategoriyalar uchun"
            onClick={handleDelete}
            loading={pending}
            destructive
          />
        ) : null}
      </div>
      {error ? (
        <p className="px-4 text-[13px] text-destructive">
          {getApiErrorMessage(error)}
        </p>
      ) : null}
    </div>
  );
}

interface ResetToDefaultRowProps {
  categoryId: number;
  onSuccess: () => void;
}

/**
 * Inline action that hard-deletes a system-linked tenant row so the system
 * default reappears in the merged catalog. Hard-delete is only available for
 * categories with no active references; backend rejects otherwise.
 */
function ResetToDefaultRow({
  categoryId,
  onSuccess,
}: ResetToDefaultRowProps): React.ReactElement {
  const remove = useDeleteCategory();

  function handleClick(): void {
    if (
      !confirm(
        'Tashkilotning sozlamalari o‘chiriladi, tizim qiymatlari tiklanadi. Davom etamizmi?',
      )
    )
      return;
    tgHapticImpact('medium');
    remove.mutate(categoryId, {
      onSuccess: () => {
        tgHapticNotify('success');
        onSuccess();
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  return (
    <ActionRow
      title="Tizim defaultiga qaytarish"
      subtitle="Faqat ishlatilmagan kategoriya uchun"
      onClick={handleClick}
      loading={remove.isPending}
      icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
    />
  );
}

interface ActionRowProps {
  title: string;
  subtitle?: string;
  onClick: () => void;
  loading?: boolean;
  destructive?: boolean;
  icon?: React.ReactNode;
}

function ActionRow({
  title,
  subtitle,
  onClick,
  loading,
  destructive,
  icon,
}: ActionRowProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent disabled:opacity-50"
    >
      <div className="min-w-0 flex-1">
        <div
          className={`flex items-center gap-2 text-[15px] font-medium ${
            destructive ? 'text-destructive' : 'text-foreground'
          }`}
        >
          {icon}
          <span>{title}</span>
        </div>
        {subtitle ? (
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            {subtitle}
          </div>
        ) : null}
      </div>
      {loading ? <Spinner /> : null}
    </button>
  );
}
