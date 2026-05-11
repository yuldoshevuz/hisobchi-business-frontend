import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/api/hooks/use-accounts';
import { ACCOUNT_TYPE_ICON } from '@/components/accounts/account-meta';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import {
  useCategories,
  useSystemCategories,
} from '@/api/hooks/use-categories';
import { useContacts } from '@/api/hooks/use-contacts';
import { useCreateExpense } from '@/api/hooks/use-expenses';
import { useMembers } from '@/api/hooks/use-members';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  getApiErrorDetails,
  getApiErrorMessage,
  isDuplicateDetected,
} from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import { ContactPickerField } from './ContactPickerField';
import {
  AmountField,
  DescriptionField,
  SelectField,
} from './form-primitives';
import type { CreateExpenseRequest } from '@/types/transaction.types';

interface ExpenseFormProps {
  onCreated: (transactionId: number) => void;
}

/** System category code for salary payments — set by the seed script. */
const SALARY_SYSTEM_CATEGORY_CODE = 'SALARY';

type ExpenseKind = 'general' | 'salary';

interface KindOption {
  value: ExpenseKind;
  labelKey: string;
  descriptionKey: string;
}

const KIND_OPTIONS: readonly KindOption[] = [
  {
    value: 'general',
    labelKey: 'expense_form.kind.general',
    descriptionKey: 'expense_form.kind.general_description',
  },
  {
    value: 'salary',
    labelKey: 'expense_form.kind.salary',
    descriptionKey: 'expense_form.kind.salary_description',
  },
];

/**
 * Expense: EXPENSE. The user picks a kind first ("general" vs "salary"). The
 * salary kind locks the system "Oyliklar" category and forces an employee
 * (member) selector — saved on `metadata.employeeMemberId` so reports can
 * later list payments per worker. The general kind exposes the regular
 * category + contact pickers.
 *
 * One OUT cash flow leaves the chosen account either way; the backend treats
 * salary as a regular expense.
 */
export function ExpenseForm({
  onCreated,
}: ExpenseFormProps): React.ReactElement {
  const { t } = useTranslation();
  const accounts = useAccounts({ status: 'active' });
  const contacts = useContacts({ all: true, status: 'active' });
  const categories = useCategories({ all: true, type: 'expense' });
  // Used only to find the salary system-category id by its code. Cheap query
  // — small table, cached by react-query, fired once per session.
  const systemCategories = useSystemCategories({ type: 'expense', all: true });
  const members = useMembers({ status: 'active' });

  const accountList = useMemo(() => accounts.data ?? [], [accounts.data]);
  const contactList = useMemo(
    () => contacts.data?.data ?? [],
    [contacts.data],
  );
  const categoryList = useMemo(
    () => categories.data?.data ?? [],
    [categories.data],
  );
  const memberList = useMemo(
    () => members.data?.data ?? [],
    [members.data],
  );
  const salarySystemCategoryId = useMemo(() => {
    const found = systemCategories.data?.data.find(
      (c) => c.code === SALARY_SYSTEM_CATEGORY_CODE,
    );
    return found?.id ?? null;
  }, [systemCategories.data]);

  const [kind, setKind] = useState<ExpenseKind>('general');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [contactId, setContactId] = useState<number | null>(null);
  const [employeeMemberId, setEmployeeMemberId] = useState<number | null>(null);
  // `'system:<id>'` for not-yet-instantiated system categories. Resolved on
  // submit so the API receives either `categoryId` or `systemCategoryId`.
  const [categoryRef, setCategoryRef] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const account = accountList.find((a) => a.id === accountId) ?? null;
  const currency = account?.currency ?? 'UZS';

  const numericAmount = Number(amount.trim() || '0');
  const isAmountValid =
    Number.isFinite(numericAmount) && numericAmount > 0;
  const isFormValid =
    Boolean(accountId) &&
    isAmountValid &&
    (kind !== 'salary' || Boolean(employeeMemberId));

  const create = useCreateExpense();

  async function submit(): Promise<void> {
    if (!isFormValid || !account) return;
    tgHapticImpact('light');

    const categoryFields =
      kind === 'salary'
        ? salarySystemCategoryId !== null
          ? { systemCategoryId: salarySystemCategoryId }
          : {}
        : parseCategoryRef(categoryRef);

    const metadata =
      kind === 'salary' && employeeMemberId
        ? { employeeMemberId }
        : undefined;

    const body: CreateExpenseRequest = {
      currency: account.currency,
      amount: amount.trim(),
      cashFlows: [
        {
          accountId: account.id,
          amount: amount.trim(),
        },
      ],
      ...(kind === 'general' && contactId ? { contactId } : {}),
      ...categoryFields,
      ...(metadata ? { metadata } : {}),
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
      <KindSelector
        value={kind}
        onChange={(next) => {
          setKind(next);
          // Switching kinds resets the kind-specific fields so a half-filled
          // salary doesn't leak into a general expense.
          setEmployeeMemberId(null);
          setContactId(null);
          if (next === 'salary') setCategoryRef('');
        }}
      />

      <SelectField
        id="expense-account"
        label={`${t('expense_form.account')} *`}
        value={accountId ?? ''}
        onChange={setAccountId}
        options={accountList.map((a) => ({
          value: a.id,
          label: `${a.name} · ${a.currency}`,
          icon: ACCOUNT_TYPE_ICON[a.type],
        }))}
      />

      <AmountField
        id="expense-amount"
        value={amount}
        onChange={setAmount}
        currencyDisplay={currency}
        autoFocus
      />

      {kind === 'salary' ? (
        <SelectField
          id="expense-employee"
          label={`${t('expense_form.employee')} *`}
          value={employeeMemberId ?? ''}
          onChange={setEmployeeMemberId}
          options={memberList.map((m) => ({
            value: m.id,
            label: m.user.fullName,
          }))}
          helperText={
            memberList.length === 0 && !members.isPending
              ? t('expense_form.no_employees')
              : t('expense_form.salary_helper')
          }
        />
      ) : (
        <>
          <CategoryPicker
            id="expense-category"
            value={categoryRef}
            onChange={setCategoryRef}
            options={categoryList
              .map((c) => {
                const ref = c.systemCategoryId
                  ? `system:${c.systemCategoryId}`
                  : c.id !== null
                    ? `id:${c.id}`
                    : '';
                if (!ref) return null;
                return {
                  value: ref,
                  label: c.name,
                  iconNode: (
                    <CategoryIcon
                      icon={c.icon}
                      color={c.color}
                      fallbackText={c.name}
                    />
                  ),
                };
              })
              .filter((o): o is NonNullable<typeof o> => o !== null)}
            label={t('expense_form.category')}
            helperText={t('expense_form.category_helper')}
          />

          <ContactPickerField
            id="expense-contact"
            label={t('expense_form.contact')}
            value={contactId ?? ''}
            onChange={setContactId}
            contacts={contactList}
            helperText={t('expense_form.contact_helper')}
          />
        </>
      )}

      <DescriptionField
        id="expense-description"
        value={description}
        onChange={setDescription}
        placeholder={
          kind === 'salary'
            ? t('expense_form.description_salary_placeholder')
            : t('expense_form.description_general_placeholder')
        }
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

interface KindSelectorProps {
  value: ExpenseKind;
  onChange: (next: ExpenseKind) => void;
}

function KindSelector({
  value,
  onChange,
}: KindSelectorProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium leading-none">
        {t('expense_form.kind_label')}
      </span>
      <div className="grid grid-cols-2 gap-2">
        {KIND_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              className={
                'press flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors ' +
                (selected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-input bg-card text-muted-foreground active:bg-accent')
              }
            >
              <span className="font-medium text-foreground">{t(option.labelKey)}</span>
              <span className="text-[11px] leading-tight">
                {t(option.descriptionKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface CategoryPickerOption {
  value: string;
  label: string;
  iconNode?: React.ReactNode;
}

interface CategoryPickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: CategoryPickerOption[];
  helperText?: string;
}

function CategoryPicker({
  id,
  label,
  value,
  onChange,
  options,
  helperText,
}: CategoryPickerProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <SelectField<string>
      id={id}
      label={label}
      value={value === '' ? null : value}
      onChange={(next) => onChange(next ?? '')}
      options={options}
      placeholder={t('edit_tx_category.placeholder')}
      helperText={helperText}
    />
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
