import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/api/hooks/use-categories';
import { useUpdateProduct } from '@/api/hooks/use-products';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import { UnitPicker } from '@/components/products/UnitPicker';
import { SelectField } from '@/components/transactions/forms/form-primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  type Product,
  type UnitOfMeasure,
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

type ProductKind = 'product' | 'service';

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
  const initialKind: ProductKind =
    product.currentStock !== null ? 'product' : 'service';

  const [name, setName] = useState<string>(product.name);
  const [categoryKey, setCategoryKey] = useState<string>(initialKey);
  const [productType, setProductType] = useState<ProductKind>(initialKind);
  const [unit, setUnit] = useState<UnitOfMeasure>(product.unit);

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

  const categoryChanged = selected !== null && selected.key !== initialKey;
  const kindChanged = productType !== initialKind;
  const unitChanged = unit !== product.unit;

  const hasChanges =
    trimmedName !== product.name ||
    categoryChanged ||
    kindChanged ||
    unitChanged;

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
    if (kindChanged) {
      body.currentStock = productType === 'product' ? '0' : null;
    }
    if (unitChanged) body.unit = unit;
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
    trimmedName,
    categoryChanged,
    selected,
    isNameValid,
    hasChanges,
    onClose,
    kindChanged,
    productType,
    unitChanged,
    unit,
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
            iconNode: (
              <CategoryIcon icon={o.icon} color={o.color} fallbackText={o.name} />
            ),
          }))}
          clearable
        />
      )}

      <div className="space-y-1.5">
        <Label>{t('edit_product.product_type')}</Label>
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
                    ? 'edit_product.type_product'
                    : 'edit_product.type_service',
                )}
              </button>
            );
          })}
        </div>
      </div>

      <UnitPicker value={unit} onChange={setUnit} />

      <p className="text-[12px] text-muted-foreground">
        {t('edit_product.currency_locked', { currency: product.currency })}
      </p>

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
