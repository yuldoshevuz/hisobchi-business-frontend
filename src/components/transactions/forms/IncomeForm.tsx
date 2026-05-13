import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/api/hooks/use-accounts';
import { ACCOUNT_TYPE_ICON } from '@/components/accounts/account-meta';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import { useCategories } from '@/api/hooks/use-categories';
import { useContacts } from '@/api/hooks/use-contacts';
import { useCreateIncome } from '@/api/hooks/use-incomes';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  getApiErrorDetails,
  getApiErrorMessage,
  isDuplicateDetected,
} from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import { useInlineCreateContact } from '@/api/hooks/use-inline-create';
import { ContactPickerField } from './ContactPickerField';
import {
  AmountField,
  DescriptionField,
  SelectField,
} from './form-primitives';
import type { CreateIncomeRequest } from '@/types/transaction.types';

interface IncomeFormProps {
  onCreated: (transactionId: number) => void;
}

/**
 * Income: INCOME. One IN cash flow lands on the chosen account. Used for
 * non-sale revenue — interest, refunds, miscellaneous receipts. Sales of
 * goods belong on the dedicated `/sales` flow so the inventory side runs.
 */
export function IncomeForm({
  onCreated,
}: IncomeFormProps): React.ReactElement {
  const { t } = useTranslation();
  const accounts = useAccounts({ status: 'active' });
  const contacts = useContacts({ all: true, status: 'active' });
  const categories = useCategories({ all: true, type: 'income' });

  const accountList = useMemo(() => accounts.data ?? [], [accounts.data]);
  const contactList = useMemo(
    () => contacts.data?.data ?? [],
    [contacts.data],
  );
  const categoryList = useMemo(
    () => categories.data?.data ?? [],
    [categories.data],
  );

  const [accountId, setAccountId] = useState<number | null>(null);
  const [contactId, setContactId] = useState<number | null>(null);
  const inlineContact = useInlineCreateContact('partner');
  const [categoryRef, setCategoryRef] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const account = accountList.find((a) => a.id === accountId) ?? null;
  const currency = account?.currency ?? 'UZS';

  const numericAmount = Number(amount.trim() || '0');
  const isFormValid =
    Boolean(accountId) &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0;

  const create = useCreateIncome();

  async function submit(): Promise<void> {
    if (!isFormValid || !account) return;
    tgHapticImpact('light');

    const categoryFields = parseCategoryRef(categoryRef);

    const body: CreateIncomeRequest = {
      currency: account.currency,
      amount: amount.trim(),
      cashFlows: [
        {
          accountId: account.id,
          amount: amount.trim(),
        },
      ],
      ...(contactId ? { contactId } : {}),
      ...categoryFields,
      ...(description.trim() ? { description: description.trim() } : {}),
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
        id="income-account"
        label={`${t('income_form.account')} *`}
        value={accountId ?? ''}
        onChange={setAccountId}
        options={accountList.map((a) => ({
          value: a.id,
          label: `${a.name} · ${a.currency}`,
          icon: ACCOUNT_TYPE_ICON[a.type],
        }))}
      />

      <AmountField
        id="income-amount"
        value={amount}
        onChange={setAmount}
        currencyDisplay={currency}
        autoFocus
      />

      <SelectField<string>
        id="income-category"
        label={t('income_form.category')}
        value={categoryRef === '' ? null : categoryRef}
        onChange={(next) => setCategoryRef(next ?? '')}
        options={categoryList.flatMap((c) => {
          const ref = c.systemCategoryId
            ? `system:${c.systemCategoryId}`
            : c.id !== null
              ? `id:${c.id}`
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
        placeholder={t('edit_tx_category.placeholder')}
        helperText={t('expense_form.category_helper')}
        clearable
      />

      <ContactPickerField
        id="income-contact"
        label={t('income_form.contact')}
        value={contactId ?? ''}
        onChange={setContactId}
        contacts={contactList}
        helperText={t('income_form.contact_helper')}
        clearable
        onCreate={async (name) => {
          const id = await inlineContact.onCreate(name);
          if (id !== null) setContactId(id);
        }}
        creating={inlineContact.creating}
      />

      <DescriptionField
        id="income-description"
        value={description}
        onChange={setDescription}
        placeholder={t('expense_form.description_general_placeholder')}
      />

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

function parseCategoryRef(
  ref: string,
): { categoryId?: number; systemCategoryId?: number } {
  if (!ref) return {};
  const [kind, idStr] = ref.split(':');
  const id = Number(idStr);
  if (!Number.isFinite(id)) return {};
  if (kind === 'system') return { systemCategoryId: id };
  if (kind === 'id') return { categoryId: id };
  return {};
}
