import { useCallback, useMemo, useState } from 'react';
import { useCategories } from '@/api/hooks/use-categories';
import { useCreateProduct } from '@/api/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { ACCOUNT_CURRENCY_VALUES } from '@/types/account.types';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
} from '@/types/product.types';
import type { AccountCurrency } from '@/types/account.types';

interface CreateProductFormProps {
  onClose: () => void;
}

interface CategoryOption {
  /** Stable key for `<select>` (kind:id). */
  key: string;
  /** Either an instantiated tenant row id, or null when only system. */
  categoryId: number | null;
  /** System category id when this row links to one (system default or system-linked). */
  systemCategoryId: number | null;
  name: string;
}

export function CreateProductForm({
  onClose,
}: CreateProductFormProps): React.ReactElement {
  const create = useCreateProduct();
  // Pickers need the full catalog in one shot. The backend exposes `all=true`
  // to bypass pagination so the picker never misses options.
  const categories = useCategories({ type: 'product', all: true });

  const [name, setName] = useState<string>('');
  const [categoryKey, setCategoryKey] = useState<string>('');
  const [currency, setCurrency] = useState<AccountCurrency>('UZS');
  const [defaultPrice, setDefaultPrice] = useState<string>('');
  const [defaultCost, setDefaultCost] = useState<string>('');
  const [trackStock, setTrackStock] = useState<boolean>(true);
  const [currentStock, setCurrentStock] = useState<string>('0');

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
  const isCategoryValid = selected !== null;
  const isValid = isNameValid && isCategoryValid;

  const submit = useCallback((): void => {
    if (!isValid || !selected) return;
    const trimmedPrice = defaultPrice.trim();
    const trimmedCost = defaultCost.trim();
    const trimmedStock = currentStock.trim();
    create.mutate(
      {
        name: trimmedName,
        currency,
        ...(selected.categoryId !== null
          ? { categoryId: selected.categoryId }
          : selected.systemCategoryId !== null
            ? { systemCategoryId: selected.systemCategoryId }
            : {}),
        ...(trimmedPrice ? { defaultPrice: trimmedPrice } : {}),
        ...(trimmedCost ? { defaultCost: trimmedCost } : {}),
        ...(trackStock
          ? { currentStock: trimmedStock || '0' }
          : { currentStock: null }),
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
    defaultPrice,
    defaultCost,
    trackStock,
    currentStock,
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
        <Label htmlFor="product-name">Nom</Label>
        <Input
          id="product-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pepsi 1.5L"
          maxLength={PRODUCT_NAME_MAX_LENGTH}
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-category">Kategoriya</Label>
        {categories.isPending ? (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Spinner /> Yuklanmoqda…
          </div>
        ) : options.length > 0 ? (
          <select
            id="product-category"
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
        ) : (
          <p className="text-[12px] text-muted-foreground">
            "Mahsulot" turidagi kategoriyalar yo‘q. Avval kategoriya yarating.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Valyuta</Label>
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="product-price">Narx</Label>
          <Input
            id="product-price"
            value={defaultPrice}
            onChange={(e) => setDefaultPrice(e.target.value)}
            placeholder="12000"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="product-cost">Tannarx</Label>
          <Input
            id="product-cost"
            value={defaultCost}
            onChange={(e) => setDefaultCost(e.target.value)}
            placeholder="8000"
            inputMode="decimal"
          />
        </div>
      </div>

      <label
        htmlFor="track-stock"
        className="press flex cursor-pointer items-center gap-3 rounded-xl bg-card px-4 py-3"
      >
        <Checkbox
          id="track-stock"
          checked={trackStock}
          onCheckedChange={(v) => setTrackStock(v === true)}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium">Ombor hisobi</div>
          <div className="text-[12px] text-muted-foreground">
            Xizmat yoki raqamli mahsulot uchun o‘chiring
          </div>
        </div>
      </label>

      {trackStock ? (
        <div className="space-y-1.5">
          <Label htmlFor="product-stock">Boshlang‘ich qoldiq</Label>
          <Input
            id="product-stock"
            value={currentStock}
            onChange={(e) => setCurrentStock(e.target.value)}
            placeholder="0"
            inputMode="decimal"
          />
        </div>
      ) : null}

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
        Saqlash
      </Button>
    </form>
  );
}
