import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/api/hooks/use-accounts';
import { ACCOUNT_TYPE_ICON } from '@/components/accounts/account-meta';
import { useContacts } from '@/api/hooks/use-contacts';
import { useCreateDebt } from '@/api/hooks/use-debts';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
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
import type { CreateDebtRequest } from '@/types/transaction.types';

interface BorrowFormProps {
  onCreated: (transactionId: number) => void;
}

/**
 * Borrow: DEBT_IN. The user receives money from someone (or some org) and
 * promises to pay it back. One IN cash flow on the chosen account, optional
 * lender (`contactId`), optional `dueDate`.
 */
export function BorrowForm({
  onCreated,
}: BorrowFormProps): React.ReactElement {
  const { t } = useTranslation();
  const accounts = useAccounts({ status: 'active' });
  const contacts = useContacts({ all: true, status: 'active' });

  const accountList = useMemo(
    () => accounts.data ?? [],
    [accounts.data],
  );
  const contactList = useMemo(
    () => contacts.data?.data ?? [],
    [contacts.data],
  );

  const [accountId, setAccountId] = useState<number | null>(null);
  const [contactId, setContactId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  const account = accountList.find((a) => a.id === accountId) ?? null;
  const currency = account?.currency ?? 'UZS';

  const trimmedAmount = amount.trim();
  const numericAmount = Number(trimmedAmount);
  const isFormValid =
    Boolean(accountId) &&
    Boolean(contactId) &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0;

  const create = useCreateDebt();

  async function submit(): Promise<void> {
    if (!isFormValid || !account || !contactId) return;
    tgHapticImpact('light');

    const body: CreateDebtRequest = {
      direction: 'borrowed',
      amount: trimmedAmount,
      currency: account.currency,
      contactId,
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
        label={`${t('borrow_form.to_account')} *`}
        value={accountId ?? ''}
        onChange={setAccountId}
        options={accountList.map((a) => ({
          value: a.id,
          label: `${a.name} · ${a.currency}`,
          icon: ACCOUNT_TYPE_ICON[a.type],
        }))}
      />

      <AmountField
        id="borrow-amount"
        value={amount}
        onChange={setAmount}
        currencyDisplay={currency}
        autoFocus
      />

      <ContactPickerField
        id="borrow-contact"
        label={`${t('borrow_form.lender')} *`}
        value={contactId ?? ''}
        onChange={setContactId}
        contacts={contactList}
        helperText={t('borrow_form.lender_helper')}
      />

      <div className="space-y-1.5">
        <Label htmlFor="borrow-due">{t('borrow_form.due_date')}</Label>
        <DatePicker
          id="borrow-due" value={dueDate}
          onChange={setDueDate}
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
        {t('common.save')}
      </Button>
    </form>
  );
}
