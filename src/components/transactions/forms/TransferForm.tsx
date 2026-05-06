import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccounts } from '@/api/hooks/use-accounts';
import { ACCOUNT_TYPE_ICON } from '@/components/accounts/account-meta';
import {
  convertViaUzs,
  useCurrencyRates,
} from '@/api/hooks/use-currency-rates';
import { useCreateTransfer } from '@/api/hooks/use-transfers';
import { useFeature } from '@/api/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  getApiErrorDetails,
  getApiErrorMessage,
  isDuplicateDetected,
} from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import { AmountField, SelectField } from './form-primitives';
import {
  formatAmount,
  formatAmountDisplay,
  unformatAmount,
} from './form-utils';
import type { CreateTransferRequest } from '@/types/transaction.types';

interface TransferFormProps {
  onCreated: (transactionId: number) => void;
}

/**
 * Transfer: TRANSFER. Two cash_flows in one event — OUT from `source` and
 * IN to `destination`. When the two accounts share a currency, both legs
 * carry the same amount. When they differ, the user enters the source amount
 * and the destination amount is auto-derived from the latest CBU rates
 * (UZS-pivoted), with the rate stored in the transaction's `metadata`.
 */
export function TransferForm({
  onCreated,
}: TransferFormProps): React.ReactElement {
  const navigate = useNavigate();
  const accounts = useAccounts({ status: 'active' });
  const rates = useCurrencyRates();
  // Cross-currency transfers are gated by ADVANCED_TRANSACTIONS. Same-currency
  // transfers stay free across plans, so we evaluate the lock dynamically
  // based on the chosen accounts.
  const advancedTxGate = useFeature('ADVANCED_TRANSACTIONS');

  const accountList = useMemo(
    () => accounts.data ?? [],
    [accounts.data],
  );

  // The account chip → "Balansdan balansga o'tkazish" action passes the
  // account id via the URL so the form lands with the source pre-selected.
  // Falls back to `null` when opened from the dashboard or a deep link.
  const [searchParams] = useSearchParams();
  const initialSourceId = useMemo<number | null>(() => {
    const raw = searchParams.get('fromAccountId');
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);
  const [sourceAccountId, setSourceAccountId] = useState<number | null>(
    initialSourceId,
  );
  const [destAccountId, setDestAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>('');
  // Lets the user override the auto-converted destination amount when they
  // know the actual exchange rate they're getting (e.g. paying a higher
  // black-market rate vs. the official CBU mid-rate).
  const [destAmountOverride, setDestAmountOverride] = useState<string>('');

  const sourceAccount =
    accountList.find((a) => a.id === sourceAccountId) ?? null;
  const destAccount =
    accountList.find((a) => a.id === destAccountId) ?? null;

  const sourceCurrency = sourceAccount?.currency ?? '';
  const destCurrency = destAccount?.currency ?? '';
  const sameCurrency = Boolean(
    sourceCurrency && destCurrency && sourceCurrency === destCurrency,
  );

  // Whether a rate exists for the chosen currency pair, independent of the
  // amount the user has typed — lets us distinguish "rate is missing" from
  // "user has not entered a number yet" so we don't false-alarm on empty input.
  const rateAvailable = useMemo(() => {
    if (!sourceCurrency || !destCurrency) return false;
    if (sameCurrency) return true;
    return (
      convertViaUzs(rates.data, '1', sourceCurrency, destCurrency) !== null
    );
  }, [rates.data, sourceCurrency, destCurrency, sameCurrency]);

  const autoConverted = useMemo(() => {
    if (!sourceCurrency || !destCurrency || !amount) return null;
    if (sameCurrency) return amount;
    return convertViaUzs(rates.data, amount, sourceCurrency, destCurrency);
  }, [rates.data, amount, sourceCurrency, destCurrency, sameCurrency]);

  const destAmount = sameCurrency
    ? amount
    : (destAmountOverride || autoConverted || '');

  // Compute the effective rate stored in metadata: how many `destCurrency`
  // units 1 `sourceCurrency` unit becomes. 6 decimals is too lossy for
  // UZS-denominated pairs (rate = ~0.000083 USD/UZS, rounding loses ~3
  // significant digits and the backend's 0.01 tolerance trips on million
  // -size source amounts). 12 decimals keeps round-trip math accurate.
  const effectiveRate = useMemo(() => {
    if (sameCurrency) return null;
    const a = Number(amount);
    const d = Number(destAmount);
    if (!Number.isFinite(a) || !Number.isFinite(d) || a <= 0 || d <= 0) {
      return null;
    }
    return (d / a).toFixed(12);
  }, [amount, destAmount, sameCurrency]);

  const trimmedAmount = amount.trim();
  const numericAmount = Number(trimmedAmount);
  const crossCurrencyLocked =
    !sameCurrency &&
    Boolean(sourceCurrency) &&
    Boolean(destCurrency) &&
    advancedTxGate.isReady &&
    !advancedTxGate.isEnabled;
  const isFormValid =
    Boolean(sourceAccountId) &&
    Boolean(destAccountId) &&
    sourceAccountId !== destAccountId &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    Number(destAmount) > 0 &&
    !crossCurrencyLocked;

  const create = useCreateTransfer();

  async function submit(): Promise<void> {
    if (!isFormValid || !sourceAccount || !destAccount) return;
    tgHapticImpact('light');

    // Auto-fill the description with `source => dest` so the ledger row
     // reads naturally without asking the user for a label.
    const autoDescription = `${sourceAccount.name} → ${destAccount.name}`;

    const body: CreateTransferRequest = {
      fromAccountId: sourceAccount.id,
      toAccountId: destAccount.id,
      amount: trimmedAmount,
      description: autoDescription,
      ...(!sameCurrency && effectiveRate
        ? {
            toAmount: destAmount,
            exchangeRate: effectiveRate,
            metadata: {
              source: 'cbu_official',
            },
          }
        : {}),
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
        id="transfer-source"
        label="Qayerdan *"
        value={sourceAccountId ?? ''}
        onChange={(id) => {
          setSourceAccountId(id);
          if (id !== null && destAccountId === id) setDestAccountId(null);
          setDestAmountOverride('');
        }}
        options={accountList.map((a) => ({
          value: a.id,
          label: `${a.name} · ${a.currency}`,
          icon: ACCOUNT_TYPE_ICON[a.type],
        }))}
      />

      <SelectField
        id="transfer-dest"
        label="Qayerga *"
        value={destAccountId ?? ''}
        onChange={(id) => {
          setDestAccountId(id);
          setDestAmountOverride('');
        }}
        options={accountList
          .filter((a) => a.id !== sourceAccountId)
          .map((a) => ({
            value: a.id,
            label: `${a.name} · ${a.currency}`,
            icon: ACCOUNT_TYPE_ICON[a.type],
          }))}
        disabled={!sourceAccountId}
      />

      <AmountField
        id="transfer-amount"
        label="Summa (yuborilayotgan) *"
        value={amount}
        onChange={(v) => {
          setAmount(v);
          setDestAmountOverride('');
        }}
        currencyDisplay={sourceCurrency}
      />

      {!sameCurrency && sourceCurrency && destCurrency ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <Label className="text-[12px] uppercase tracking-wide text-muted-foreground">
              Olinadigan summa
            </Label>
            {rates.isPending ? (
              <Spinner className="h-3 w-3" />
            ) : null}
          </div>

          {!rateAvailable && !rates.isPending ? (
            <p className="text-[13px] text-destructive">
              {sourceCurrency} → {destCurrency} kursi topilmadi
            </p>
          ) : autoConverted ? (
            <div className="flex items-baseline gap-2">
              <span className="text-[18px] font-semibold tabular-nums">
                {formatAmountDisplay(destAmountOverride || autoConverted)}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {destCurrency}
              </span>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              Yuborilayotgan summani kiriting
            </p>
          )}

          {autoConverted && effectiveRate ? (
            <p className="text-[12px] text-muted-foreground">
              CBU kursi: 1 {sourceCurrency} ≈ {trimDecimalZeros(effectiveRate)}{' '}
              {destCurrency}
            </p>
          ) : null}

          {rateAvailable ? (
            <button
              type="button"
              onClick={() =>
                setDestAmountOverride(
                  destAmountOverride ? '' : (autoConverted ?? ''),
                )
              }
              className="press text-[12px] text-primary"
            >
              {destAmountOverride
                ? 'CBU kursiga qaytish'
                : "Qo'lda kiritish"}
            </button>
          ) : null}

          {destAmountOverride !== '' ? (
            <input
              type="text"
              inputMode="decimal"
              value={formatAmount(destAmountOverride)}
              onChange={(e) =>
                setDestAmountOverride(unformatAmount(e.target.value))
              }
              placeholder="0"
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-base text-foreground transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          ) : null}
        </div>
      ) : null}

      {crossCurrencyLocked ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
          <div className="flex-1 text-amber-900">
            Valyutalararo o&apos;tkazma joriy tarifda mavjud emas. Bir xil
            valyutali hisoblar tanlang yoki{' '}
            <button
              type="button"
              onClick={() => navigate('/plans')}
              className="underline"
            >
              tarifni yangilang
            </button>
            .
          </div>
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
        {crossCurrencyLocked ? 'Tarif kerak' : 'Saqlash'}
      </Button>
    </form>
  );
}

/**
 * Strip trailing zeros after the decimal point (and the dot itself when
 * nothing meaningful is left). The CBU rate column is `Decimal(19,4)` so
 * "12037.2100" gets rendered as "12037.21"; "12037.0000" becomes "12037".
 * Pure-string operation — keeps full precision when the trailing digits
 * are non-zero.
 */
function trimDecimalZeros(value: string): string {
  if (!value.includes('.')) return value;
  return value.replace(/\.?0+$/, '');
}
