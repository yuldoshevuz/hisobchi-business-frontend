import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/api/hooks/use-accounts';
import { ACCOUNT_TYPE_ICON } from '@/components/accounts/account-meta';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import { useCategories } from '@/api/hooks/use-categories';
import { useCreateProduct, useProducts } from '@/api/hooks/use-products';
import { useCreatePurchase } from '@/api/hooks/use-purchases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  getApiErrorDetails,
  getApiErrorMessage,
  isDuplicateDetected,
} from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { AmountField, SelectField } from './form-primitives';
import { formatAmountDisplay } from './form-utils';
import type { CreatePurchaseRequest } from '@/types/transaction.types';

interface PurchaseFormProps {
  onCreated: (transactionId: number) => void;
}

/**
 * Purchase: PURCHASE. The user picks an existing product or types a new name;
 * either way the line item is recorded with quantity + unit cost. Stock is
 * increased by `items[].quantity` server-side, in the same prisma transaction
 * that writes the cash_flow OUT.
 */
export function PurchaseForm({
  onCreated,
}: PurchaseFormProps): React.ReactElement {
  const { t } = useTranslation();
  const accounts = useAccounts({ status: 'active' });
  const products = useProducts({ status: 'active', all: true });
  // Used in "Yangi mahsulot" mode to pick where the freshly-created product
  // lands in the catalog. Limited to product-typed categories (system + custom).
  const productCategories = useCategories({ all: true, type: 'product' });

  const accountList = useMemo(
    () => accounts.data ?? [],
    [accounts.data],
  );
  const productList = useMemo(
    () => products.data?.data ?? [],
    [products.data],
  );
  const productCategoryList = useMemo(
    () => productCategories.data?.data ?? [],
    [productCategories.data],
  );

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [productId, setProductId] = useState<number | null>(null);
  const [newProductName, setNewProductName] = useState<string>('');
  // Either a real org-scoped id or a `system:<id>` virtual id for not-yet-
  // instantiated system categories. Resolved on submit.
  const [newProductCategoryRef, setNewProductCategoryRef] = useState<string>('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [unitCost, setUnitCost] = useState<string>('');

  const product = productList.find((p) => p.id === productId) ?? null;
  const account = accountList.find((a) => a.id === accountId) ?? null;
  const currency = account?.currency ?? product?.currency ?? 'UZS';

  const totalAmount = useMemo(() => {
    const q = Number(quantity || '0');
    const c = Number(unitCost || '0');
    if (!Number.isFinite(q) || !Number.isFinite(c)) return '0';
    return (q * c).toFixed(4);
  }, [quantity, unitCost]);

  const numericTotal = Number(totalAmount);
  const productSelected =
    mode === 'existing'
      ? Boolean(productId)
      : newProductName.trim().length > 0 && newProductCategoryRef !== '';
  const isFormValid =
    productSelected &&
    Boolean(accountId) &&
    Number.isFinite(numericTotal) &&
    numericTotal > 0 &&
    Number(quantity) > 0;

  const create = useCreatePurchase();
  const createProduct = useCreateProduct();

  async function submit(): Promise<void> {
    if (!isFormValid || !account) return;
    tgHapticImpact('light');

    try {
      // "Yangi mahsulot" mode → spin up the product first so the purchase row
      // can carry a real productId (the backend records a stock movement and
      // refuses null productIds for purchase items that ship inventory).
      let resolvedProduct: { id: number; name: string } | null = null;
      if (mode === 'existing' && product) {
        resolvedProduct = { id: product.id, name: product.name };
      } else if (mode === 'new') {
        const [refKind, refIdRaw] = newProductCategoryRef.split(':');
        const refId = Number(refIdRaw);
        if (!Number.isFinite(refId) || refId <= 0) return;
        const created = await createProduct.mutateAsync({
          name: newProductName.trim(),
          currency: account.currency,
          ...(refKind === 'org'
            ? { categoryId: refId }
            : { systemCategoryId: refId }),
        });
        resolvedProduct = { id: created.id, name: created.name };
      }
      if (!resolvedProduct) return;

      const body: CreatePurchaseRequest = {
        currency: account.currency,
        amount: totalAmount,
        cashFlows: [
          {
            accountId: account.id,
            amount: totalAmount,
          },
        ],
        items: [
          {
            productId: resolvedProduct.id,
            name: resolvedProduct.name,
            quantity,
            unitPrice: unitCost,
            cost: unitCost,
          },
        ],
      };

      const result = await create.mutateAsync(body);
      tgHapticNotify('success');
      onCreated(result.id);
    } catch (e) {
      tgHapticNotify('error');
      if (isDuplicateDetected(e)) {
        const details = getApiErrorDetails(e) as
          | { transactionId?: number }
          | undefined;
        if (details?.transactionId) onCreated(details.transactionId);
      }
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-5 px-4 pb-32 pt-2"
    >
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {(
          [
            ['existing', t('purchase_form.mode_existing')],
            ['new', t('purchase_form.mode_new')],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'press flex-1 rounded-lg px-3 py-2 text-[13px] font-medium',
              mode === m
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'existing' ? (
        <SelectField
          id="purchase-product"
          label={`${t('sale_form.product')} *`}
          value={productId ?? ''}
          onChange={setProductId}
          options={productList.map((p) => ({
            value: p.id,
            label: `${p.name} · ${p.currency}`,
          }))}
        />
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="purchase-new-name">{`${t('purchase_form.new_product_name')} *`}</Label>
            <Input
              id="purchase-new-name"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder={t('purchase_form.new_product_placeholder')}
            />
            <p className="text-[12px] text-muted-foreground">
              {t('purchase_form.new_product_hint')}
            </p>
          </div>

          <SelectField<string>
            id="purchase-new-category"
            label={`${t('purchase_form.category')} *`}
            value={newProductCategoryRef === '' ? null : newProductCategoryRef}
            onChange={(next) => setNewProductCategoryRef(next ?? '')}
            options={productCategoryList.flatMap((c) => {
              const ref =
                c.id !== null
                  ? `org:${c.id}`
                  : c.systemCategoryId !== null
                    ? `sys:${c.systemCategoryId}`
                    : '';
              if (!ref) return [];
              return [
                {
                  value: ref,
                  label: c.name,
                  iconNode: (
                    <CategoryIcon
                      icon={c.icon}
                      color={c.color}
                      fallbackText={c.name}
                    />
                  ),
                },
              ];
            })}
          />
        </div>
      )}

      <SelectField
        id="purchase-account"
        label={`${t('purchase_form.account')} *`}
        value={accountId ?? ''}
        onChange={setAccountId}
        options={accountList
          .filter((a) => !product || a.currency === product.currency)
          .map((a) => ({
            value: a.id,
            label: `${a.name} · ${a.currency}`,
            icon: ACCOUNT_TYPE_ICON[a.type],
          }))}
      />

      <div className="space-y-1.5">
        <Label htmlFor="purchase-qty">{`${t('purchase_form.quantity')} *`}</Label>
        <Input
          id="purchase-qty"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="1"
        />
      </div>

      <AmountField
        id="purchase-cost"
        label={`${t('purchase_form.unit_cost')} *`}
        value={unitCost}
        onChange={setUnitCost}
        currencyDisplay={currency}
      />

      {Number(quantity) > 1 ? (
        <div className="rounded-xl bg-muted/40 px-3 py-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('purchase_form.total_sum')}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatAmountDisplay(totalAmount)} {currency}
            </span>
          </div>
        </div>
      ) : null}

      {create.isError || createProduct.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(create.error ?? createProduct.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="xl"
        className="w-full"
        disabled={
          !isFormValid || create.isPending || createProduct.isPending
        }
      >
        {create.isPending || createProduct.isPending ? <Spinner /> : null}
        {t('common.save')}
      </Button>
    </form>
  );
}
