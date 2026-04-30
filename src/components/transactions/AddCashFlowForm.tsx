import { useMemo, useState } from 'react';
import { useAccounts } from '@/api/hooks/use-accounts';
import { useAddDebtRepayment } from '@/api/hooks/use-debts';
import { useAddPurchasePayment } from '@/api/hooks/use-purchases';
import { useAddSalePayment } from '@/api/hooks/use-sales';
import { ACCOUNT_TYPE_ICON } from '@/components/accounts/account-meta';
import {
  formatAmount,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import { SelectField } from '@/components/transactions/forms/form-primitives';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  getApiErrorMessage,
  isOverpaymentRejected,
} from '@/lib/api-error';
import { repaymentDirection } from '@/lib/transaction-meta';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  CASH_FLOW_NOTES_MAX_LENGTH,
  type AddPaymentRequest,
  type Transaction,
  type TransactionType,
} from '@/types/transaction.types';

interface AddCashFlowFormProps {
  transaction: Transaction;
  /** Pre-populates the amount field; useful for the overpayment deep link. */
  suggestedAmount?: string;
  /** Pre-checks the "allowOverpayment" toggle (deep link / retry case). */
  defaultAllowOverpayment?: boolean;
  onClose: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function decimalLte(value: string, max: string): boolean {
  // Quick numeric check; backend remains the authority.
  const a = Number(value);
  const b = Number(max);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  return a <= b;
}

/**
 * Whether the parent transaction type accepts repayments through the in-app
 * sheet. INCOME / EXPENSE are out of scope today (no `/incomes/:id/payments`
 * UI flow), and TRANSFER / OPENING_BALANCE / ADJUSTMENT / SUSPENSE never do.
 */
function supportsRepayment(type: TransactionType): boolean {
  return (
    type === 'sale' ||
    type === 'purchase' ||
    type === 'debt_out' ||
    type === 'debt_in'
  );
}

export function AddCashFlowForm({
  transaction,
  suggestedAmount,
  defaultAllowOverpayment = false,
  onClose,
}: AddCashFlowFormProps): React.ReactElement {
  const direction = repaymentDirection(transaction.type);
  const accounts = useAccounts({ status: 'active' });
  const matchingAccounts = useMemo(
    () =>
      (accounts.data ?? []).filter(
        (a) => a.currency === transaction.currency,
      ),
    [accounts.data, transaction.currency],
  );

  const remaining = (
    Number(transaction.amount) - Number(transaction.paidAmount)
  ).toFixed(2);

  const [accountId, setAccountId] = useState<number>(0);
  const [amount, setAmount] = useState<string>(
    suggestedAmount ?? (Number(remaining) > 0 ? remaining : ''),
  );
  const [date, setDate] = useState<string>(todayIso());
  const [notes, setNotes] = useState<string>('');
  const [allowOverpayment, setAllowOverpayment] = useState<boolean>(
    defaultAllowOverpayment,
  );

  const [seedRunForAccountList, setSeedRunForAccountList] = useState<
    number | null
  >(null);
  const matchingFingerprint = matchingAccounts[0]?.id ?? null;
  if (
    accountId === 0 &&
    matchingAccounts.length > 0 &&
    seedRunForAccountList !== matchingFingerprint
  ) {
    setSeedRunForAccountList(matchingFingerprint);
    setAccountId(matchingAccounts[0].id);
  }

  // Three mutations are hooked unconditionally (rules of hooks). At call time
  // we pick the right one based on the parent transaction's type.
  const addSalePayment = useAddSalePayment();
  const addPurchasePayment = useAddPurchasePayment();
  const addDebtRepayment = useAddDebtRepayment();

  const activeMutation =
    transaction.type === 'sale'
      ? addSalePayment
      : transaction.type === 'purchase'
        ? addPurchasePayment
        : transaction.type === 'debt_out' || transaction.type === 'debt_in'
          ? addDebtRepayment
          : null;

  const trimmedAmount = amount.trim();
  const numericAmount = Number(trimmedAmount);
  const isAmountValid =
    Number.isFinite(numericAmount) && numericAmount > 0;
  const exceedsRemaining =
    isAmountValid && !decimalLte(trimmedAmount, remaining);
  const requiresOverpaymentFlag = exceedsRemaining && !allowOverpayment;

  const isFormValid =
    direction !== null &&
    accountId > 0 &&
    isAmountValid &&
    Boolean(date) &&
    activeMutation !== null;

  async function submit(): Promise<void> {
    if (!isFormValid || !activeMutation) return;

    const body: AddPaymentRequest = {
      accountId,
      amount: trimmedAmount,
      date,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(allowOverpayment ? { allowOverpayment: true } : {}),
    };

    try {
      if (transaction.type === 'sale') {
        await addSalePayment.mutateAsync({ saleId: transaction.id, body });
      } else if (transaction.type === 'purchase') {
        await addPurchasePayment.mutateAsync({
          purchaseId: transaction.id,
          body,
        });
      } else {
        // DEBT_IN / DEBT_OUT
        await addDebtRepayment.mutateAsync({ debtId: transaction.id, body });
      }
      tgHapticNotify('success');
      onClose();
    } catch (e) {
      if (isOverpaymentRejected(e)) {
        setAllowOverpayment(true);
      }
      tgHapticNotify('error');
    }
  }

  if (!supportsRepayment(transaction.type) || direction === null) {
    return (
      <p className="px-2 py-4 text-[13px] text-muted-foreground">
        Bu turdagi tranzaktsiyaga to'lov qo'shib bo'lmaydi.
      </p>
    );
  }

  const isPending = activeMutation?.isPending ?? false;
  const error = activeMutation?.error;
  const hasOverpaymentError = isOverpaymentRejected(error);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        tgHapticImpact('light');
        void submit();
      }}
      className="space-y-4"
    >
      <div className="rounded-xl bg-muted/40 px-3 py-2 text-[13px]">
        <div className="flex justify-between text-muted-foreground">
          <span>Qoldiq</span>
          <span className="tabular-nums text-foreground">
            {remaining} {transaction.currency}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Yo'nalish</span>
          <span className="text-foreground">
            {direction === 'in' ? 'Kirim' : 'Chiqim'}
          </span>
        </div>
      </div>

      <SelectField
        id="cf-account"
        label="Hisob"
        value={accountId === 0 ? null : accountId}
        onChange={(id) => setAccountId(id ?? 0)}
        options={matchingAccounts.map((a) => ({
          value: a.id,
          label: `${a.name} · ${a.currency}`,
          icon: ACCOUNT_TYPE_ICON[a.type],
        }))}
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="cf-amount">Summa</Label>
          <Input
            id="cf-amount"
            inputMode="decimal"
            value={formatAmount(amount)}
            onChange={(e) => setAmount(unformatAmount(e.target.value))}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-date">Sana</Label>
          <DatePicker
            id="cf-date" value={date}
            onChange={setDate}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-notes">Eslatma</Label>
        <textarea
          id="cf-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={CASH_FLOW_NOTES_MAX_LENGTH}
          rows={2}
          placeholder="Ixtiyoriy"
          className="flex min-h-[60px] w-full rounded-xl border border-input bg-card px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {(exceedsRemaining || hasOverpaymentError) ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3">
          <input
            type="checkbox"
            checked={allowOverpayment}
            onChange={(e) => setAllowOverpayment(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-[13px]">
            <span className="font-medium text-foreground">
              Ortiqcha to'lovni tasdiqlash
            </span>
            <span className="block text-muted-foreground">
              Summa qoldiqdan ortiq. Tasdiqlasangiz, "overpaid" holatiga o'tadi.
            </span>
          </span>
        </label>
      ) : null}

      {error ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={
          !isFormValid || isPending || requiresOverpaymentFlag
        }
      >
        {isPending ? <Spinner /> : null}
        Saqlash
      </Button>
    </form>
  );
}
