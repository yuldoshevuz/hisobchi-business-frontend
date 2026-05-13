import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/api/hooks/use-accounts';
import { ACCOUNT_TYPE_ICON } from '@/components/accounts/account-meta';
import { useContacts } from '@/api/hooks/use-contacts';
import { useProducts } from '@/api/hooks/use-products';
import { useCreateSale } from '@/api/hooks/use-sales';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  getApiErrorDetails,
  getApiErrorMessage,
  isDuplicateDetected,
} from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  useInlineCreateContact,
  useInlineCreateProduct,
} from '@/api/hooks/use-inline-create';
import { AmountField, SelectField } from './form-primitives';
import { ContactPickerField } from './ContactPickerField';
import { formatAmountDisplay, formatProductMeta } from './form-utils';
import type {
  CreateSaleRequest,
  PaymentLegRequest,
} from '@/types/transaction.types';
import { StockShortfallWarning } from './StockShortfallWarning';

interface SaleFormProps {
  onCreated: (transactionId: number) => void;
}

/**
 * Sotuv: SALE. Defaults to a paid sale (one IN cash flow lands on the chosen
 * account). When the "Qarzga sotdim" toggle is on, the form switches to a
 * credit-sale shape: cashFlows is empty, contact becomes required and a
 * `dueDate` input appears so the user can record when the customer promised
 * to pay. The selected account is still required in credit mode — the
 * backend uses its currency to validate the sale's currency.
 */
export function SaleForm({
  onCreated,
}: SaleFormProps): React.ReactElement {
  const { t } = useTranslation();
  const accounts = useAccounts({ status: 'active' });
  const contacts = useContacts({ all: true, status: 'active' });
  const products = useProducts({ status: 'active', all: true });

  const accountList = useMemo(
    () => accounts.data ?? [],
    [accounts.data],
  );
  const productList = useMemo(
    () => products.data?.data ?? [],
    [products.data],
  );
  const contactList = useMemo(
    () => contacts.data?.data ?? [],
    [contacts.data],
  );

  const [productId, setProductId] = useState<number | null>(null);
  const [contactId, setContactId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  // Inline-create plumbing for the contact picker. New contacts default
  // to `customer` since sale forms attribute revenue to a buyer.
  const inlineContact = useInlineCreateContact('customer');
  // Product inline-create uses the org base currency (UZS by default) —
  // the picker's currency-filter on accounts narrows compatible
  // accounts automatically once the user picks the new product.
  const inlineProduct = useInlineCreateProduct();
  const [quantity, setQuantity] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [isCredit, setIsCredit] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>('');

  const product = productList.find((p) => p.id === productId) ?? null;
  const account = accountList.find((a) => a.id === accountId) ?? null;
  const currency = account?.currency ?? product?.currency ?? 'UZS';

  // When the user picks a product, prefill the price with its default.
  const [seenProductId, setSeenProductId] = useState<number | null>(null);
  if (productId !== seenProductId) {
    setSeenProductId(productId);
    if (product?.defaultPrice) setUnitPrice(product.defaultPrice);
  }

  const tracksStock = product?.currentStock !== null;
  // Service-style products (currentStock = null) don't take a quantity.
  const effectiveQuantity = tracksStock ? quantity : '1';

  const totalAmount = useMemo(() => {
    const q = Number(effectiveQuantity || '0');
    const p = Number(unitPrice || '0');
    if (!Number.isFinite(q) || !Number.isFinite(p)) return '0';
    return (q * p).toFixed(4);
  }, [effectiveQuantity, unitPrice]);

  const numericTotal = Number(totalAmount);
  const isAmountValid = Number.isFinite(numericTotal) && numericTotal > 0;
  const isFormValid =
    Boolean(productId) &&
    Boolean(accountId) &&
    isAmountValid &&
    (!tracksStock || Number(quantity) > 0) &&
    // Credit mode requires a contact — there's no other anchor for who owes.
    (!isCredit || Boolean(contactId));

  const create = useCreateSale();

  async function submit(): Promise<void> {
    if (!isFormValid || !product || !account) return;
    tgHapticImpact('light');

    const cashFlows: PaymentLegRequest[] = isCredit
      ? []
      : [{ accountId: account.id, amount: totalAmount }];

    const body: CreateSaleRequest = {
      currency: account.currency,
      amount: totalAmount,
      cashFlows,
      ...(contactId ? { contactId } : {}),
      ...(isCredit && dueDate ? { dueDate } : {}),
      items: [
        {
          productId: product.id,
          name: product.name,
          // Backend validator requires a numeric string — `null` is
          // rejected with AMOUNT_INVALID. For service products
          // (currentStock=null) we default to '1' so the line still
          // posts; the UI just hides the quantity input.
          quantity: tracksStock ? quantity : '1',
          unitPrice,
          cost: product.defaultCost ?? null,
        },
      ],
    };

    try {
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
      <SelectField
        id="sotuv-product"
        label={`${t('sale_form.product')} *`}
        value={productId ?? ''}
        onChange={setProductId}
        options={productList.map((p) => ({
          value: p.id,
          label: p.name,
          description: formatProductMeta(p, t),
        }))}
        helperText={
          productList.length === 0 && !products.isPending
            ? t('sale_form.no_products')
            : undefined
        }
        onCreate={async (name) => {
          const id = await inlineProduct.onCreate(name);
          if (id !== null) setProductId(id);
        }}
        creating={inlineProduct.creating}
      />

      <SelectField
        id="sotuv-account"
        label={`${isCredit ? t('sale_form.account_label_credit') : t('sale_form.account_label_normal')} *`}
        value={accountId ?? ''}
        onChange={setAccountId}
        options={accountList
          .filter((a) => !product || a.currency === product.currency)
          .map((a) => ({
            value: a.id,
            label: `${a.name} · ${a.currency}`,
            icon: ACCOUNT_TYPE_ICON[a.type],
          }))}
        helperText={
          isCredit
            ? t('sale_form.account_helper_credit')
            : product
              ? t('sale_form.account_helper_currency', {
                  currency: product.currency,
                })
              : undefined
        }
      />

      <ContactPickerField
        id="sotuv-contact"
        label={isCredit ? `${t('sale_form.contact_required')} *` : t('sale_form.contact_optional')}
        value={contactId ?? ''}
        onChange={setContactId}
        contacts={contactList}
        helperText={
          isCredit
            ? t('sale_form.contact_helper_credit')
            : t('sale_form.contact_helper_normal')
        }
        clearable={!isCredit}
        onCreate={async (name) => {
          const id = await inlineContact.onCreate(name);
          if (id !== null) setContactId(id);
        }}
        creating={inlineContact.creating}
      />

      {tracksStock ? (
        <div className="space-y-1.5">
          <Label htmlFor="sotuv-qty">{`${t('sale_form.quantity')} *`}</Label>
          <Input
            id="sotuv-qty"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="1"
          />
          {product && product.currentStock !== null ? (
            <p className="text-[12px] text-muted-foreground">
              {t('sale_form.stock_remaining', { n: product.currentStock })}
            </p>
          ) : null}
        </div>
      ) : null}

      <StockShortfallWarning
        product={product}
        requestedQuantity={effectiveQuantity}
      />

      <AmountField
        id="sotuv-price"
        label={`${t('sale_form.unit_price')} *`}
        value={unitPrice}
        onChange={setUnitPrice}
        currencyDisplay={currency}
      />

      {tracksStock && Number(quantity) > 1 ? (
        <div className="rounded-xl bg-muted/40 px-3 py-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {isCredit ? t('sale_form.total_debt') : t('sale_form.total_sum')}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatAmountDisplay(totalAmount)} {currency}
            </span>
          </div>
        </div>
      ) : null}

      <CreditToggle value={isCredit} onChange={setIsCredit} />

      {isCredit ? (
        <div className="space-y-1.5">
          <Label htmlFor="sotuv-due">{t('sale_form.due_date')}</Label>
          <DatePicker
            id="sotuv-due"
            value={dueDate}
            onChange={setDueDate}
          />
          <p className="text-[12px] text-muted-foreground">
            {t('sale_form.due_date_helper')}
          </p>
        </div>
      ) : null}

      {create.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(create.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="xl"
        className="w-full"
        disabled={!isFormValid || create.isPending}
      >
        {create.isPending ? <Spinner /> : null}
        {t('common.save')}
      </Button>
    </form>
  );
}

interface CreditToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

function CreditToggle({
  value,
  onChange,
}: CreditToggleProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-input bg-card px-3 py-2.5 active:bg-accent">
      <Checkbox
        className="mt-1"
        checked={value}
        onCheckedChange={(next) => onChange(next === true)}
      />
      <span className="flex-1">
        <span className="block text-[14px] font-medium leading-tight">
          {t('sale_form.on_credit_title')}
        </span>
        <span className="mt-0.5 block text-[12px] text-muted-foreground">
          {t('sale_form.on_credit_description')}
        </span>
      </span>
    </label>
  );
}
