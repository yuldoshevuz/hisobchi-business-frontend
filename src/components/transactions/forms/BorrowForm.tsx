import { useMemo, useState } from 'react';
import { useAccounts } from '@/api/hooks/use-accounts';
import { useClients } from '@/api/hooks/use-clients';
import { useCreateDebt } from '@/api/hooks/use-debts';
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
import { AmountField, SelectField } from './form-primitives';
import type { CreateDebtRequest } from '@/types/transaction.types';

interface BorrowFormProps {
  onCreated: (transactionId: number) => void;
}

/**
 * Borrow: DEBT_IN. The user receives money from someone (or some org) and
 * promises to pay it back. One IN cash flow on the chosen account, optional
 * lender (`clientId`), optional `dueDate`.
 */
export function BorrowForm({
  onCreated,
}: BorrowFormProps): React.ReactElement {
  const accounts = useAccounts({ status: 'active' });
  const clients = useClients({ all: true, status: 'active' });

  const accountList = useMemo(
    () => accounts.data ?? [],
    [accounts.data],
  );
  const clientList = useMemo(
    () => clients.data?.data ?? [],
    [clients.data],
  );

  const [accountId, setAccountId] = useState<number | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  const account = accountList.find((a) => a.id === accountId) ?? null;
  const currency = account?.currency ?? 'UZS';

  const trimmedAmount = amount.trim();
  const numericAmount = Number(trimmedAmount);
  const isFormValid =
    Boolean(accountId) &&
    Boolean(clientId) &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0;

  const create = useCreateDebt();

  async function submit(): Promise<void> {
    if (!isFormValid || !account || !clientId) return;
    tgHapticImpact('light');

    const body: CreateDebtRequest = {
      direction: 'borrowed',
      amount: trimmedAmount,
      currency: account.currency,
      clientId,
      accountId: account.id,
      ...(dueDate ? { dueDate } : {}),
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
        id="borrow-account"
        label="Balans (qaerga keldi) *"
        value={accountId ?? ''}
        onChange={setAccountId}
        options={accountList.map((a) => ({
          value: a.id,
          label: `${a.name} · ${a.currency}`,
        }))}
      />

      <AmountField
        id="borrow-amount"
        value={amount}
        onChange={setAmount}
        currencyDisplay={currency}
        autoFocus
      />

      <SelectField
        id="borrow-client"
        label="Kimdan *"
        value={clientId ?? ''}
        onChange={setClientId}
        options={clientList.map((c) => ({ value: c.id, label: c.name }))}
        helperText="Qarz beruvchini tanlash majburiy"
      />

      <div className="space-y-1.5">
        <Label htmlFor="borrow-due">Qaytarish sanasi</Label>
        <Input
          id="borrow-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
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
        Saqlash
      </Button>
    </form>
  );
}
