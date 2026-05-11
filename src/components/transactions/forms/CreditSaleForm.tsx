import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/api/hooks/use-accounts';
import { ACCOUNT_TYPE_ICON } from '@/components/accounts/account-meta';
import { useContacts } from '@/api/hooks/use-contacts';
import { useProducts } from '@/api/hooks/use-products';
import { useCreateSale } from '@/api/hooks/use-sales';
import { Button } from '@/components/ui/button';
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
import { AmountField, SelectField } from './form-primitives';
import { ContactPickerField } from './ContactPickerField';
import { formatAmountDisplay } from './form-utils';
import type { CreateSaleRequest } from '@/types/transaction.types';

interface CreditSaleFormProps {
  onCreated: (transactionId: number) => void;
}

/**
 * Credit sale: SALE with empty `cashFlows[]`. The customer takes the goods
 * now, pays later. Quantity is null for service-style products. The selected
 * `accountId` is informational — there is no immediate cash flow — but the
 * backend uses its currency to validate the sale's currency.
 */
export function CreditSaleForm({
  onCreated,
}: CreditSaleFormProps): React.ReactElement {
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
  const [accountId, setAccountId] = useState<number | null>(null);
  const [contactId, setContactId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  const product = productList.find((p) => p.id === productId) ?? null;
  const account = accountList.find((a) => a.id === accountId) ?? null;
  const currency = account?.currency ?? product?.currency ?? 'UZS';
  const tracksStock = product?.currentStock !== null;

  const [seenProductId, setSeenProductId] = useState<number | null>(null);
  if (productId !== seenProductId) {
    setSeenProductId(productId);
    if (product?.defaultPrice) setUnitPrice(product.defaultPrice);
  }

  const effectiveQuantity = tracksStock ? quantity : '1';
  const totalAmount = useMemo(() => {
    const q = Number(effectiveQuantity || '0');
    const p = Number(unitPrice || '0');
    if (!Number.isFinite(q) || !Number.isFinite(p)) return '0';
    return (q * p).toFixed(4);
  }, [effectiveQuantity, unitPrice]);

  const numericTotal = Number(totalAmount);
  const isFormValid =
    Boolean(productId) &&
    Boolean(accountId) &&
    Boolean(contactId) &&
    Number.isFinite(numericTotal) &&
    numericTotal > 0 &&
    (!tracksStock || Number(quantity) > 0);

  const create = useCreateSale();

  async function submit(): Promise<void> {
    if (!isFormValid || !account || !product || !contactId) return;
    tgHapticImpact('light');

    const body: CreateSaleRequest = {
      currency: account.currency,
      amount: totalAmount,
      cashFlows: [],
      contactId,
      ...(dueDate ? { dueDate } : {}),
      items: [
        {
          productId: product.id,
          name: product.name,
          quantity: tracksStock ? quantity : null,
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
      <div className="rounded-xl bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground">
        {t('credit_sale_form.intro')}
      </div>

      <SelectField
        id="credit-product"
        label={`${t('form.product')} *`}
        value={productId ?? ''}
        onChange={setProductId}
        options={productList.map((p) => ({
          value: p.id,
          label: `${p.name} · ${p.currency}`,
        }))}
      />

      <SelectField
        id="credit-account"
        label={`${t('form.account')} *`}
        value={accountId ?? ''}
        onChange={setAccountId}
        options={accountList
          .filter((a) => !product || a.currency === product.currency)
          .map((a) => ({
            value: a.id,
            label: `${a.name} · ${a.currency}`,
            icon: ACCOUNT_TYPE_ICON[a.type],
          }))}
        helperText={t('credit_sale_form.account_helper')}
      />

      <ContactPickerField
        id="credit-contact"
        label={`${t('credit_sale_form.customer')} *`}
        value={contactId ?? ''}
        onChange={setContactId}
        contacts={contactList}
        helperText={t('credit_sale_form.customer_helper')}
      />

      {tracksStock ? (
        <div className="space-y-1.5">
          <Label htmlFor="credit-qty">{`${t('credit_sale_form.quantity')} *`}</Label>
          <Input
            id="credit-qty"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="1"
          />
          {product && product.currentStock !== null ? (
            <p className="text-[12px] text-muted-foreground">
              {t('credit_sale_form.stock_left')}: {product.currentStock}
            </p>
          ) : null}
        </div>
      ) : null}

      <AmountField
        id="credit-price"
        label={`${t('credit_sale_form.unit_price')} *`}
        value={unitPrice}
        onChange={setUnitPrice}
        currencyDisplay={currency}
      />

      {tracksStock && Number(quantity) > 1 ? (
        <div className="rounded-xl bg-muted/40 px-3 py-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('credit_sale_form.total_debt')}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatAmountDisplay(totalAmount)} {currency}
            </span>
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="credit-due">{t('credit_sale_form.due_date')}</Label>
        <DatePicker
          id="credit-due" value={dueDate}
          onChange={setDueDate}
        />
        <p className="text-[12px] text-muted-foreground">
          {t('credit_sale_form.due_date_helper')}
        </p>
      </div>

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
