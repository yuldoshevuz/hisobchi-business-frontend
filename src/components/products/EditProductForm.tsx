import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/api/hooks/use-categories';
import { useUpdateProduct } from '@/api/hooks/use-products';
import { useFeature } from '@/api/hooks/use-subscription';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import { SelectField } from '@/components/transactions/forms/form-primitives';
import {
  formatAmount,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticNotify } from '@/lib/telegram';
import {
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  type Product,
  type UpdateProductRequest,
} from '@/types/product.types';

interface EditProductFormProps {
  product: Product;
  onClose: () => void;
}

interface CategoryOption {
  key: string;
  categoryId: number | null;
  systemCategoryId: number | null;
  name: string;
  icon: string | null;
  color: string | null;
}

export function EditProductForm({
  product,
  onClose,
}: EditProductFormProps): React.ReactElement {
  const { t } = useTranslation();
  const update = useUpdateProduct();
  const categories = useCategories({ type: 'product', all: true });

  // Initial selection — match by instantiated id when set; otherwise leave
  // empty so the user is forced to pick before saving.
  const initialKey =
    product.categoryId !== null ? `id:${product.categoryId}` : '';

  const [name, setName] = useState<string>(product.name);
  const [categoryKey, setCategoryKey] = useState<string>(initialKey);
  const [defaultPrice, setDefaultPrice] = useState<string>(
    product.defaultPrice ?? '',
  );
  const [defaultCost, setDefaultCost] = useState<string>(
    product.defaultCost ?? '',
  );
  // Stock-tracking toggle. `currentStock === null` → service; any
  // numeric → tracked product. Switching tracked → service wipes the
  // balance on the server side; switching service → tracked opens a
  // fresh ledger seeded with the user-entered opening stock.
  const inventoryGate = useFeature('INVENTORY_MANAGEMENT');
  const canTrackStock = inventoryGate.isEnabled;
  const initialTrackStock = product.currentStock !== null;
  const [trackStock, setTrackStock] = useState<boolean>(initialTrackStock);
  const [openingStock, setOpeningStock] = useState<string>('0');

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

  const initialPrice = product.defaultPrice ?? '';
  const initialCost = product.defaultCost ?? '';
  const trimmedPrice = defaultPrice.trim();
  const trimmedCost = defaultCost.trim();

  const categoryChanged =
    selected !== null && selected.key !== initialKey;

  const trackStockChanged = trackStock !== initialTrackStock;

  const hasChanges =
    trimmedName !== product.name ||
    categoryChanged ||
    trimmedPrice !== initialPrice ||
    trimmedCost !== initialCost ||
    trackStockChanged;

  const submit = useCallback((): void => {
    if (!isNameValid || !hasChanges) return;
    const body: UpdateProductRequest = {};
    if (trimmedName !== product.name) body.name = trimmedName;
    if (categoryChanged && selected) {
      if (selected.categoryId !== null) {
        body.categoryId = selected.categoryId;
      } else if (selected.systemCategoryId !== null) {
        body.systemCategoryId = selected.systemCategoryId;
      }
    }
    if (trimmedPrice !== initialPrice) {
      body.defaultPrice = trimmedPrice === '' ? null : trimmedPrice;
    }
    if (trimmedCost !== initialCost) {
      body.defaultCost = trimmedCost === '' ? null : trimmedCost;
    }
    if (trackStockChanged) {
      body.currentStock = trackStock ? openingStock.trim() || '0' : null;
    }
    update.mutate(
      { id: product.id, body },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [
    update,
    product.id,
    product.name,
    initialPrice,
    initialCost,
    trimmedName,
    categoryChanged,
    selected,
    trimmedPrice,
    trimmedCost,
    isNameValid,
    hasChanges,
    onClose,
    trackStockChanged,
    trackStock,
    openingStock,
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
        <Label htmlFor="edit-product-name">{t('edit_product.name')}</Label>
        <Input
          id="edit-product-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={PRODUCT_NAME_MAX_LENGTH}
          required
          autoFocus
        />
      </div>

      {categories.isPending ? (
        <div className="space-y-1.5">
          <Label>{t('edit_product.category')}</Label>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Spinner /> {t('edit_product.loading')}
          </div>
        </div>
      ) : (
        <SelectField<string>
          id="edit-product-category"
          label={t('edit_product.category')}
          value={categoryKey === '' ? null : categoryKey}
          onChange={(next) => setCategoryKey(next ?? '')}
          options={options.map((o) => ({
            value: o.key,
            label: o.name,
            iconNode: <CategoryIcon icon={o.icon} color={o.color} fallbackText={o.name} />,
          }))}
          clearable
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-product-price">{t('edit_product.price')}</Label>
          <Input
            id="edit-product-price"
            value={formatAmount(defaultPrice)}
            onChange={(e) => setDefaultPrice(unformatAmount(e.target.value))}
            placeholder={t('edit_product.price_placeholder')}
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-product-cost">{t('edit_product.cost')}</Label>
          <Input
            id="edit-product-cost"
            value={formatAmount(defaultCost)}
            onChange={(e) => setDefaultCost(unformatAmount(e.target.value))}
            placeholder={t('edit_product.cost_placeholder')}
            inputMode="decimal"
          />
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground">
        {t('edit_product.currency_locked', { currency: product.currency })}
      </p>

      {/* Stock-tracking toggle. Service ↔ Product is a structural switch
          on the server, so we surface a clear hint for both directions
          to set expectations before the user saves. */}
      <label
        htmlFor="edit-track-stock"
        className={`press flex items-center gap-3 rounded-xl bg-card px-4 py-3 ${
          canTrackStock || initialTrackStock
            ? 'cursor-pointer'
            : 'cursor-not-allowed opacity-70'
        }`}
      >
        <Checkbox
          id="edit-track-stock"
          checked={trackStock}
          disabled={!canTrackStock && !initialTrackStock}
          onCheckedChange={(v) => {
            if (!canTrackStock && !initialTrackStock) return;
            setTrackStock(v === true);
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium">
            {t('edit_product.track_stock')}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {trackStock
              ? trackStockChanged && !initialTrackStock
                ? t('edit_product.track_stock_helper_enabling')
                : t('edit_product.track_stock_helper_tracked')
              : trackStockChanged && initialTrackStock
                ? t('edit_product.track_stock_helper_disabling')
                : t('edit_product.track_stock_helper_service')}
          </div>
        </div>
      </label>

      {/* Opening-stock input — only relevant when flipping service →
          tracked. We don't surface it when the user is already tracked
          (use the dedicated AdjustStock flow) or staying in service mode. */}
      {trackStock && trackStockChanged && !initialTrackStock ? (
        <div className="space-y-1.5">
          <Label htmlFor="edit-opening-stock">
            {t('edit_product.opening_stock')}
          </Label>
          <Input
            id="edit-opening-stock"
            value={formatAmount(openingStock)}
            onChange={(e) => setOpeningStock(unformatAmount(e.target.value))}
            inputMode="decimal"
            placeholder="0"
          />
        </div>
      ) : null}

      {update.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(update.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isNameValid || !hasChanges || update.isPending}
      >
        {update.isPending ? <Spinner /> : null}
        {t('common.save')}
      </Button>
    </form>
  );
}
