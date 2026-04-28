import { useCallback, useMemo, useState } from 'react';
import { useCategories } from '@/api/hooks/use-categories';
import { useUpdateProduct } from '@/api/hooks/use-products';
import { Button } from '@/components/ui/button';
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
}

export function EditProductForm({
  product,
  onClose,
}: EditProductFormProps): React.ReactElement {
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

  const hasChanges =
    trimmedName !== product.name ||
    categoryChanged ||
    trimmedPrice !== initialPrice ||
    trimmedCost !== initialCost;

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
        <Label htmlFor="edit-product-name">Nom</Label>
        <Input
          id="edit-product-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={PRODUCT_NAME_MAX_LENGTH}
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-product-category">Kategoriya</Label>
        {categories.isPending ? (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Spinner /> Yuklanmoqda…
          </div>
        ) : (
          <select
            id="edit-product-category"
            value={categoryKey}
            onChange={(e) => setCategoryKey(e.target.value)}
            className="h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px] text-foreground"
            required
          >
            <option value="" disabled>
              — Tanlash —
            </option>
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-product-price">Narx</Label>
          <Input
            id="edit-product-price"
            value={defaultPrice}
            onChange={(e) => setDefaultPrice(e.target.value)}
            placeholder="12000"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-product-cost">Tannarx</Label>
          <Input
            id="edit-product-cost"
            value={defaultCost}
            onChange={(e) => setDefaultCost(e.target.value)}
            placeholder="8000"
            inputMode="decimal"
          />
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground">
        Valyuta o‘zgartirilmaydi ({product.currency}). Buning uchun mahsulotni
        arxivlab, qaytadan yarating.
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
        Saqlash
      </Button>
    </form>
  );
}
