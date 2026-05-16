import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  Filter,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { useCategories } from '@/api/hooks/use-categories';
import {
  useDeleteProduct,
  useProducts,
  useProductsInfinite,
  useUpdateProduct,
} from '@/api/hooks/use-products';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import { CreateProductForm } from '@/components/products/CreateProductForm';
import { EditProductForm } from '@/components/products/EditProductForm';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import {
  useInfiniteScroll,
  useViewportPageSize,
} from '@/hooks/use-infinite-scroll';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { PermissionSlug } from '@/lib/permission-slugs';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import type { Product } from '@/types/product.types';

interface ProductsPageProps {
  /** When true, skips the top PageHeader so the page can be embedded inside Katalog. */
  embedded?: boolean;
}

export function ProductsPage({
  embedded = false,
}: ProductsPageProps = {}): React.ReactElement {
  const { t } = useTranslation();
  const { isReady } = usePermissions();
  const canRead = useCan(PermissionSlug.PRODUCTS_READ);
  const canManage = useCan(PermissionSlug.PRODUCTS_MANAGE);

  const [search, setSearch] = useState<string>('');
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);
  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);

  const trimmedSearch = search.trim();

  const pageSize = useViewportPageSize(72);

  const activeProducts = useProductsInfinite(
    {
      status: 'active',
      limit: pageSize,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
      ...(filterCategoryId !== null ? { categoryId: filterCategoryId } : {}),
    },
    { enabled: canRead },
  );

  const sentinelRef = useInfiniteScroll({
    hasNextPage: activeProducts.hasNextPage,
    isFetchingNextPage: activeProducts.isFetchingNextPage,
    fetchNextPage: activeProducts.fetchNextPage,
  });

  const archivedProducts = useProducts(
    { status: 'archived', limit: 100 },
    { enabled: canRead && archiveOpen },
  );

  const productCategories = useCategories({ type: 'product', all: true });
  const categoryById = useMemo(() => {
    const map = new Map<
      number,
      { name: string; icon: string | null; color: string | null }
    >();
    for (const c of productCategories.data?.data ?? []) {
      if (c.id !== null) {
        map.set(c.id, { name: c.name, icon: c.icon, color: c.color });
      }
    }
    return map;
  }, [productCategories.data]);

  // Only org-scoped (instantiated) categories can have products attached, so
  // chips for not-yet-instantiated system rows would always return zero hits.
  const filterableCategories = useMemo(
    () =>
      (productCategories.data?.data ?? []).filter(
        (c): c is typeof c & { id: number } => c.id !== null,
      ),
    [productCategories.data],
  );

  const activeList = useMemo(
    () => (activeProducts.data?.pages ?? []).flatMap((p) => p.data),
    [activeProducts.data],
  );

  if (isReady && !canRead) {
    return (
      <AccessDeniedView
        title={t('products.title')}
        description={t('products.no_access')}
        hint="products.read"
      />
    );
  }

  return (
    <div className="pb-32">
      {embedded ? null : (
        <PageHeader
          title={t('products.title')}
          description={t('products.subtitle')}
          large
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 px-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('products.search_placeholder')}
              className="pl-9"
            />
          </div>
          {filterableCategories.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              className="relative shrink-0"
              onClick={() => {
                tgHapticImpact('light');
                setFilterOpen(true);
              }}
            >
              <Filter className="h-4 w-4" />
              {filterCategoryId !== null ? (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  1
                </span>
              ) : null}
            </Button>
          ) : null}
        </div>

        {activeProducts.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : activeProducts.isError ? (
          <Section>
            <ListItem
              asStatic
              title={
                <span className="text-destructive">
                  {getApiErrorMessage(activeProducts.error)}
                </span>
              }
            />
          </Section>
        ) : activeList.length > 0 ? (
          <>
            <Section title={t('products.active_section')}>
              {activeList.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  category={
                    p.categoryId !== null
                      ? categoryById.get(p.categoryId) ?? null
                      : null
                  }
                  onTap={() => {
                    tgHapticImpact('light');
                    setActionProduct(p);
                  }}
                />
              ))}
            </Section>
            {activeProducts.hasNextPage ? (
              <div
                ref={sentinelRef}
                className="flex justify-center py-4"
                aria-hidden="true"
              >
                {activeProducts.isFetchingNextPage ? <Spinner /> : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className="px-6 py-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-[14px] text-muted-foreground">
              {trimmedSearch
                ? t('contacts.no_results')
                : t('products.archive_subtitle')}
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
            title={t('products.archive_title')}
            subtitle={t('products.archive_subtitle')}
          />
        </Section>
      </div>

      {canManage ? (
        <ScreenAction>
          <Button
            size="xl"
            onClick={() => {
              tgHapticImpact('light');
              setCreateOpen(true);
            }}
          >
            <Plus className="h-5 w-5" />
            {t('products.add')}
          </Button>
        </ScreenAction>
      ) : null}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('products.new_title')}
        description={t('products.new_description')}
      >
        <CreateProductForm onClose={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={Boolean(actionProduct)}
        onOpenChange={(o) => {
          if (!o) setActionProduct(null);
        }}
        title={actionProduct?.name}
        description={actionProduct ? actionProduct.currency : undefined}
      >
        {actionProduct ? (
          <ProductActions
            product={actionProduct}
            canManage={canManage}
            onClose={() => setActionProduct(null)}
            onEdit={() => {
              setEditing(actionProduct);
              setActionProduct(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title={t('products.edit_title')}
        description={editing ? editing.currency : undefined}
      >
        {editing ? (
          <EditProductForm
            product={editing}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title={t('products.filter_title')}
        description={t('products.filter_description')}
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              tgHapticImpact('light');
              setFilterCategoryId(null);
              setFilterOpen(false);
            }}
            className={`press flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[15px] ${
              filterCategoryId === null
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground'
            }`}
          >
            <span>{t('products.filter_all')}</span>
            {filterCategoryId === null ? (
              <span className="text-[12px] font-medium">tanlangan</span>
            ) : null}
          </button>
          {filterableCategories.map((c) => {
            const selected = filterCategoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  tgHapticImpact('light');
                  setFilterCategoryId(selected ? null : c.id);
                  setFilterOpen(false);
                }}
                className={`press flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[15px] ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                <span className="truncate">{c.name}</span>
                {selected ? (
                  <span className="text-[12px] font-medium">tanlangan</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={t('products.archive_title')}
        description={
          archivedProducts.data?.meta
            ? t('contacts.archive_count', {
                count: archivedProducts.data.meta.total,
              })
            : undefined
        }
      >
        <ArchivedProducts
          isPending={archivedProducts.isPending}
          isError={archivedProducts.isError}
          error={archivedProducts.error}
          products={archivedProducts.data?.data ?? []}
          onTap={(p) => {
            setArchiveOpen(false);
            setActionProduct(p);
          }}
        />
      </Modal>
    </div>
  );
}

interface ProductRowProps {
  product: Product;
  category: { name: string; icon: string | null; color: string | null } | null;
  onTap: () => void;
}

function ProductRow({
  product,
  category,
  onTap,
}: ProductRowProps): React.ReactElement {
  const isService = product.currentStock === null;
  return (
    <ListItem
      onClick={onTap}
      showChevron
      leading={
        <CategoryIcon
          icon={category?.icon ?? null}
          color={category?.color ?? null}
          fallbackText={category?.name ?? product.name}
        />
      }
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{product.name}</span>
          {isService ? (
            <Badge variant="outline" className="text-[10px]">
              xizmat
            </Badge>
          ) : null}
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-1.5">
          {category ? (
            <Badge variant="secondary" className="text-[10px]">
              {category.name}
            </Badge>
          ) : null}
        </span>
      }
    />
  );
}

interface ProductActionsProps {
  product: Product;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
}

function ProductActions({
  product,
  canManage,
  onClose,
  onEdit,
}: ProductActionsProps): React.ReactElement {
  const { t } = useTranslation();
  const update = useUpdateProduct();
  const remove = useDeleteProduct();

  const isArchived = product.status === 'archived';
  const pending = update.isPending || remove.isPending;
  const error = update.error ?? remove.error;

  function handleArchive(): void {
    tgHapticImpact('medium');
    update.mutate(
      { id: product.id, body: { status: 'archived' } },
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
    tgHapticImpact('medium');
    update.mutate(
      { id: product.id, body: { status: 'active' } },
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
    if (!confirm(`${product.name} mahsulotini butunlay o‘chirishni tasdiqlaysizmi?`))
      return;
    tgHapticImpact('heavy');
    remove.mutate(product.id, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  if (!canManage) {
    return (
      <p className="px-4 py-3 text-[13px] text-muted-foreground">
        {t('products.no_manage_permission')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="-mx-4 divide-y divide-border bg-card">
        {!isArchived ? (
          <ActionRow
            title={t('products.action.edit')}
            subtitle={t('products.action.edit_subtitle')}
            onClick={onEdit}
            icon={<Pencil className="h-4 w-4 text-muted-foreground" />}
          />
        ) : null}
        {!isArchived ? (
          <ActionRow
            title={t('products.action.archive')}
            subtitle={t('products.action.archive_subtitle')}
            onClick={handleArchive}
            loading={pending}
            icon={<Archive className="h-4 w-4 text-muted-foreground" />}
          />
        ) : (
          <ActionRow
            title={t('products.action.unarchive')}
            subtitle={t('products.action.unarchive_subtitle')}
            onClick={handleRestore}
            loading={pending}
            icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
          />
        )}
        <ActionRow
          title={t('products.action.delete')}
          subtitle={t('products.action.delete_subtitle')}
          destructive
          onClick={handleDelete}
          loading={pending}
          icon={<Trash2 className="h-4 w-4 text-destructive" />}
        />
      </div>
      {error ? (
        <p className="px-4 text-[13px] text-destructive">
          {getApiErrorMessage(error)}
        </p>
      ) : null}
    </div>
  );
}

interface ArchivedProductsProps {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  products: Product[];
  onTap: (p: Product) => void;
}

function ArchivedProducts({
  isPending,
  isError,
  error,
  products,
  onTap,
}: ArchivedProductsProps): React.ReactElement {
  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="px-4 py-4 text-[13px] text-destructive">
        {getApiErrorMessage(error)}
      </p>
    );
  }
  if (products.length === 0) {
    return (
      <div className="py-8 text-center text-[14px] text-muted-foreground">
        Arxivlangan mahsulotlar yo‘q
      </div>
    );
  }
  return (
    <div className="-mx-4 divide-y divide-border bg-card">
      {products.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => {
            tgHapticImpact('light');
            onTap(p);
          }}
          className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-medium">{p.name}</div>
            <div className="text-[12px] text-muted-foreground">{p.currency}</div>
          </div>
        </button>
      ))}
    </div>
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
