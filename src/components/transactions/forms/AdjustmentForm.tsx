import { useMemo, useState } from 'react';
import { useAccounts } from '@/api/hooks/use-accounts';
import { useCreateAdjustment } from '@/api/hooks/use-adjustments';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  getApiErrorDetails,
  getApiErrorMessage,
  isDuplicateDetected,
} from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import { AmountField, SelectField } from './form-primitives';
import { formatAmountDisplay } from './form-utils';
import type { CreateAdjustmentRequest } from '@/types/transaction.types';

interface AdjustmentFormProps {
  onCreated: (transactionId: number) => void;
}

/**
 * Adjustment: ADJUSTMENT. The user enters what the account *actually* holds
 * (real cash count, real bank balance) and the system computes the diff
 * against the stored `currentBalance` to post a single IN or OUT cash flow.
 * Description is required by the backend as an audit trail.
 */
export function AdjustmentForm({
  onCreated,
}: AdjustmentFormProps): React.ReactElement {
  const accounts = useAccounts({ status: 'active' });

  const accountList = useMemo(
    () => accounts.data ?? [],
    [accounts.data],
  );

  const [accountId, setAccountId] = useState<number | null>(null);
  const [actualBalance, setActualBalance] = useState<string>('');

  const account = accountList.find((a) => a.id === accountId) ?? null;
  const currency = account?.currency ?? 'UZS';

  const currentBalance = account ? Number(account.currentBalance) : 0;
  const target = Number(actualBalance);
  const hasTarget = actualBalance.trim() !== '' && Number.isFinite(target);
  const rawDiff = hasTarget ? target - currentBalance : 0;
  // Keep four decimals to match the backend `Decimal` precision and avoid
  // false "no change" verdicts caused by float drift.
  const diff = Number(rawDiff.toFixed(4));
  const direction: 'in' | 'out' | null =
    !hasTarget || diff === 0 ? null : diff > 0 ? 'in' : 'out';
  const adjustmentAmount = Math.abs(diff).toFixed(4);

  const isFormValid =
    Boolean(account) && hasTarget && direction !== null;

  const create = useCreateAdjustment();

  async function submit(): Promise<void> {
    if (!isFormValid || !account || direction === null) return;
    tgHapticImpact('light');

    const body: CreateAdjustmentRequest = {
      accountId: account.id,
      direction,
      amount: adjustmentAmount,
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
        id="adjust-account"
        label="Hisob *"
        value={accountId ?? ''}
        onChange={(id) => {
          setAccountId(id);
          setActualBalance('');
        }}
        options={accountList.map((a) => ({
          value: a.id,
          label: `${a.name} · ${a.currency}`,
        }))}
        helperText={
          account
            ? `Joriy qoldiq: ${formatAmountDisplay(account.currentBalance)} ${account.currency}`
            : undefined
        }
      />

      <AmountField
        id="adjust-actual"
        label="Miqdor *"
        value={actualBalance}
        onChange={setActualBalance}
        currencyDisplay={currency}
      />

      {account && hasTarget ? (
        <AdjustmentPreview
          direction={direction}
          amount={adjustmentAmount}
          currency={currency}
        />
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
        Saqlash
      </Button>
    </form>
  );
}

interface AdjustmentPreviewProps {
  direction: 'in' | 'out' | null;
  amount: string;
  currency: string;
}

function AdjustmentPreview({
  direction,
  amount,
  currency,
}: AdjustmentPreviewProps): React.ReactElement {
  if (direction === null) {
    return (
      <div className="rounded-xl border border-input bg-muted/40 px-3 py-2.5 text-[13px] text-muted-foreground">
        Qoldiq mos kelmoqda — tuzatish kerak emas
      </div>
    );
  }
  const isAdd = direction === 'in';
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5',
        isAdd
          ? 'border-[var(--color-help-success)] bg-[var(--color-help-success-16)]'
          : 'border-destructive bg-destructive/10',
      )}
    >
      <div className="text-[12px] uppercase tracking-wide text-muted-foreground">
        Tuzatish summasi
      </div>
      <div
        className={cn(
          'mt-0.5 text-[18px] font-semibold tabular-nums',
          isAdd ? 'text-[var(--color-help-success)]' : 'text-destructive',
        )}
      >
        {isAdd ? '+' : '−'} {formatAmountDisplay(amount)} {currency}
      </div>
      <div className="mt-0.5 text-[12px] text-muted-foreground">
        {isAdd ? "Balansga qo'shiladi" : 'Balansdan ayriladi'}
      </div>
    </div>
  );
}
