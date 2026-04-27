import { useMemo, useState } from 'react';
import {
  Archive,
  Boxes,
  Package,
  Plus,
  RotateCcw,
  Search,
  Sliders,
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
import { AdjustStockForm } from '@/components/products/AdjustStockForm';
import { CreateProductForm } from '@/components/products/CreateProductForm';
import { EditProductForm } from '@/components/products/EditProductForm';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import {
  useInfiniteScroll,
  useViewportPageSize,
} from '@/hooks/use-infinite-scroll';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { PermissionSlug } from '@/lib/permission-slugs';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import type { Product } from '@/types/product.types';

export function ProductsPage(): React.ReactElement {
  const { isReady } = usePermissions();
  const canRead = useCan(PermissionSlug.PRODUCTS_READ);
  const canManage = useCan(PermissionSlug.PRODUCTS_MANAGE);

  const [search, setSearch] = useState<string>('');
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);
  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);

  const trimmedSearch = search.trim();

  const pageSize = useViewportPageSize(72);

  const activeProducts = useProductsInfinite(
    {
      status: 'ACTIVE',
      limit: pageSize,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
    },
    { enabled: canRead },
  );

  const sentinelRef = useInfiniteScroll({
    hasNextPage: activeProducts.hasNextPage,
    isFetchingNextPage: activeProducts.isFetchingNextPage,
    fetchNextPage: activeProducts.fetchNextPage,
  });

  const archivedProducts = useProducts(
    { status: 'ARCHIVED', limit: 100 },
    { enabled: canRead && archiveOpen },
  );

  const productCategories = useCategories({ type: 'PRODUCT', all: true });
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

  const activeList = useMemo(
    () => (activeProducts.data?.pages ?? []).flatMap((p) => p.data),
    [activeProducts.data],
  );

  if (isReady && !canRead) {
    return (
      <AccessDeniedView
        title="Mahsulotlar"
        description="Bu bo‘limga kirish uchun ruxsat yo‘q"
        hint="Mahsulotlarni ko‘rish uchun 'products.read' ruxsati kerak."
      />
    );
  }

  return (
    <div className="pb-32">
      <PageHeader
        title="Mahsulotlar"
        description="Tovar va xizmatlar katalogi"
        large
      />

      <div className="space-y-3">
        <div className="px-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom bo‘yicha qidirish"
              className="pl-9"
            />
          </div>
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
            <Section title="Faol mahsulotlar">
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
                ? 'Hech narsa topilmadi'
                : 'Mahsulotlar mavjud emas'}
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
            subtitle="Arxivlangan mahsulotlar"
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
            Yangi mahsulot
          </Button>
        </ScreenAction>
      ) : null}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Yangi mahsulot"
        description="Tovar yoki xizmat"
      >
        <CreateProductForm onClose={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={Boolean(actionProduct)}
        onOpenChange={(o) => {
          if (!o) setActionProduct(null);
        }}
        title={actionProduct?.name}
        description={
          actionProduct
            ? `${actionProduct.currency}${
                actionProduct.defaultPrice
                  ? ` · ${formatMoney(actionProduct.defaultPrice)}`
                  : ''
              }`
            : undefined
        }
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
            onAdjust={() => {
              setAdjusting(actionProduct);
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
        title="Mahsulotni tahrirlash"
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
        open={Boolean(adjusting)}
        onOpenChange={(o) => {
          if (!o) setAdjusting(null);
        }}
        title="Qoldiqni tuzatish"
        description={adjusting?.name}
      >
        {adjusting ? (
          <AdjustStockForm
            product={adjusting}
            onClose={() => setAdjusting(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Arxiv"
        description={
          archivedProducts.data?.meta
            ? `${archivedProducts.data.meta.total} ta arxivlangan mahsulot`
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
          {product.defaultPrice ? (
            <span className="tabular-nums">
              {formatMoney(product.defaultPrice, product.currency)}
            </span>
          ) : (
            <span className="text-muted-foreground/70">narx kiritilmagan</span>
          )}
          {!isService ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Boxes className="h-3 w-3" />
              <span className="tabular-nums">
                {formatMoney(product.currentStock ?? '0')}
              </span>
            </span>
          ) : null}
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
  onAdjust: () => void;
}

function ProductActions({
  product,
  canManage,
  onClose,
  onEdit,
  onAdjust,
}: ProductActionsProps): React.ReactElement {
  const update = useUpdateProduct();
  const remove = useDeleteProduct();

  const isArchived = product.status === 'ARCHIVED';
  const trackStock = product.currentStock !== null;
  const pending = update.isPending || remove.isPending;
  const error = update.error ?? remove.error;

  function handleArchive(): void {
    tgHapticImpact('medium');
    update.mutate(
      { id: product.id, body: { status: 'ARCHIVED' } },
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
      { id: product.id, body: { status: 'ACTIVE' } },
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
        Bu mahsulotni o‘zgartirish uchun ruxsat yo‘q.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="-mx-4 divide-y divide-border bg-card">
        {!isArchived ? (
          <ActionRow
            title="Tahrirlash"
            subtitle="Nom, kategoriya, narx, tannarx"
            onClick={onEdit}
          />
        ) : null}
        {!isArchived && trackStock ? (
          <ActionRow
            title="Qoldiqni tuzatish"
            subtitle="Recount, sinish, topilgan tovar"
            onClick={onAdjust}
            icon={<Sliders className="h-4 w-4 text-muted-foreground" />}
          />
        ) : null}
        {!isArchived ? (
          <ActionRow
            title="Arxivlash"
            subtitle="Yangi yozuvlardan yashiradi"
            onClick={handleArchive}
            loading={pending}
            icon={<Archive className="h-4 w-4 text-muted-foreground" />}
          />
        ) : (
          <ActionRow
            title="Arxivdan tiklash"
            subtitle="Mahsulot yana faol bo‘ladi"
            onClick={handleRestore}
            loading={pending}
            icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
          />
        )}
        <ActionRow
          title="O‘chirish"
          subtitle="Faqat tranzaksiyalarda ishlatilmagan mahsulot uchun"
          destructive
          onClick={handleDelete}
          loading={pending}
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
            <div className="text-[12px] text-muted-foreground">
              {p.currency}
              {p.defaultPrice ? ` · ${formatMoney(p.defaultPrice)}` : ''}
            </div>
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
