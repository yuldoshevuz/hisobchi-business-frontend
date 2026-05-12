import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/api/hooks/use-accounts';
import { useCategories } from '@/api/hooks/use-categories';
import { useContacts } from '@/api/hooks/use-contacts';
import { useCreateScheduled } from '@/api/hooks/use-scheduled';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import {
  formatAmount,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import {
  ContactPickerField,
} from '@/components/transactions/forms/ContactPickerField';
import { SelectField } from '@/components/transactions/forms/form-primitives';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { TRANSACTION_TYPE_LABEL } from '@/lib/transaction-meta';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  RECURRENCE_LABEL,
  RECURRENCE_ICON,
} from './scheduled-meta';
import {
  RECURRENCE_TYPE_VALUES,
  type CreateScheduledRequest,
  type RecurrenceType,
  type ScheduledType,
} from '@/types/scheduled.types';
import type { CategoryType } from '@/types/category.types';

/**
 * Maps each scheduled transaction type → the category taxonomy the
 * picker should pull from. Categories in this system have three types
 * (`expense` / `income` / `product`); `product` is the catalog
 * taxonomy used to organise products themselves, NOT to label the
 * cash-flow side of a sale or purchase transaction.
 *
 * For sale / purchase / debt rows we therefore use the cash-flow
 * direction, not `product`: sales and incoming debts behave like
 * income (money in); purchases and outgoing debts behave like
 * expense (money out). That matches what the user will pick when the
 * schedule fires and lets the same recurring plan re-use the same
 * category each occurrence.
 */
function categoryTypeFor(scheduledType: ScheduledType): CategoryType {
  switch (scheduledType) {
    case 'expense':
    case 'purchase':
    case 'debt_out':
      return 'expense';
    case 'income':
    case 'sale':
    case 'debt_in':
      return 'income';
    default:
      return 'expense';
  }
}

interface CreateScheduledFormProps {
  onClose: () => void;
}

const SCHEDULED_TYPE_VALUES: readonly ScheduledType[] = [
  'expense',
  'income',
  'sale',
  'purchase',
  'debt_out',
  'debt_in',
] as const;

const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB'] as const;

export function CreateScheduledForm({
  onClose,
}: CreateScheduledFormProps): React.ReactElement {
  const { t } = useTranslation();
  const create = useCreateScheduled();
  const accounts = useAccounts({ status: 'active' });
  const contacts = useContacts({ status: 'active', all: true });

  const [type, setType] = useState<ScheduledType>('expense');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('monthly');
  const [askOnConfirm, setAskOnConfirm] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('UZS');
  const [description, setDescription] = useState<string>('');
  const [contactId, setContactId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  // Encoded as `id:N` for tenant-instantiated rows and `system:N` for system
  // defaults the org hasn't customised yet — backend accepts either, we
  // split on submit. Empty string means "no category".
  const [categoryRef, setCategoryRef] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(isoToday());
  const [endDate, setEndDate] = useState<string>('');

  // Categories are scoped to the cash-flow taxonomy matching the
  // transaction type — see `categoryTypeFor`. The picker shows for
  // every type (debts included), since users want the same recurring
  // category to ride along on each occurrence.
  const categoryType = categoryTypeFor(type);
  const categories = useCategories({ all: true, type: categoryType });

  const accountList = accounts.data ?? [];
  const contactList = contacts.data?.data ?? [];
  const categoryList = categories.data?.data ?? [];

  const trimmedDescription = description.trim();
  const trimmedAmount = amount.trim();
  const trimmedEndDate = endDate.trim();

  const amountValid =
    askOnConfirm ||
    (trimmedAmount !== '' &&
      Number.isFinite(Number(trimmedAmount)) &&
      Number(trimmedAmount) > 0);

  const endDateValid =
    trimmedEndDate === '' || trimmedEndDate >= startDate;

  const isValid =
    trimmedDescription.length > 0 &&
    amountValid &&
    endDateValid &&
    Boolean(startDate);

  const submit = useCallback((): void => {
    if (!isValid) return;
    const body: CreateScheduledRequest = {
      type,
      currency,
      description: trimmedDescription,
      recurrenceType: recurrence,
      startDate,
      ...(askOnConfirm
        ? { amount: null }
        : { amount: trimmedAmount }),
      ...parseCategoryRef(categoryRef),
      ...(contactId !== null ? { contactId } : {}),
      ...(accountId !== null ? { defaultAccountId: accountId } : {}),
      ...(trimmedEndDate ? { endDate: trimmedEndDate } : {}),
    };
    create.mutate(body, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
      },
      onError: () => tgHapticNotify('error'),
    });
  }, [
    isValid,
    create,
    type,
    currency,
    trimmedDescription,
    recurrence,
    startDate,
    askOnConfirm,
    trimmedAmount,
    categoryRef,
    contactId,
    accountId,
    trimmedEndDate,
    onClose,
  ]);

  const typeOptions = useMemo(
    () =>
      SCHEDULED_TYPE_VALUES.map((tv) => ({
        value: tv,
        label: TRANSACTION_TYPE_LABEL[tv],
      })),
    [],
  );

  const recurrenceOptions = useMemo(
    () =>
      RECURRENCE_TYPE_VALUES.map((r) => ({
        value: r,
        label: RECURRENCE_LABEL[r],
        icon: RECURRENCE_ICON[r],
      })),
    [],
  );

  const accountOptions = useMemo(
    () =>
      accountList.map((a) => ({
        value: a.id,
        label: a.name,
        description: a.currency,
      })),
    [accountList],
  );

  // Mirror IncomeForm/ExpenseForm: emit `id:N` for instantiated rows and
  // `system:N` for system defaults the org hasn't customised yet. Both
  // resolve at submit time via `parseCategoryRef`. The icon comes from
  // the merged category row directly so the picker matches what the
  // Catalog page shows.
  const categoryOptions = useMemo(
    () =>
      categoryList.flatMap((c) => {
        const ref =
          c.id !== null
            ? `id:${c.id}`
            : c.systemCategoryId !== null
              ? `system:${c.systemCategoryId}`
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
      }),
    [categoryList],
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <SelectField
        id="sched-type"
        label={t('create_scheduled.type')}
        value={type}
        onChange={(next) => {
          if (!next) return;
          const nextType = next as ScheduledType;
          setType(nextType);
          // The category list switches taxonomies (expense / income /
          // product) when type flips — a category picked for the
          // previous type would be invalid, so reset.
          setCategoryRef('');
        }}
        options={typeOptions}
      />

      <SelectField
        id="sched-recurrence"
        label={t('create_scheduled.recurrence')}
        value={recurrence}
        onChange={(next) => next && setRecurrence(next as RecurrenceType)}
        options={recurrenceOptions}
      />

      <div className="space-y-1.5">
        <Label htmlFor="sched-description">{t('create_scheduled.description')}</Label>
        <Input
          id="sched-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('create_scheduled.description_placeholder')}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sched-amount">{t('create_scheduled.amount')}</Label>
          <Input
            id="sched-amount"
            inputMode="decimal"
            value={formatAmount(amount)}
            onChange={(e) => setAmount(unformatAmount(e.target.value))}
            placeholder="0"
            disabled={askOnConfirm}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('create_scheduled.currency')}</Label>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => {
              const selected = currency === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    tgHapticImpact('light');
                    setCurrency(c);
                  }}
                  className={`press min-w-[56px] rounded-xl border px-2 py-2 text-[13px] font-medium ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <label
        htmlFor="sched-ask-on-confirm"
        className="press flex cursor-pointer items-start gap-3 rounded-xl border border-input bg-card px-3 py-2.5 active:bg-accent"
      >
        <Checkbox
          id="sched-ask-on-confirm"
          className="mt-1"
          checked={askOnConfirm}
          onCheckedChange={(v) => setAskOnConfirm(v === true)}
        />
        <span className="flex-1">
          <span className="block text-[14px] font-medium leading-tight">
            {t('create_scheduled.ask_on_confirm')}
          </span>
          <span className="mt-0.5 block text-[12px] text-muted-foreground">
            {t('create_scheduled.ask_on_confirm_hint')}
          </span>
        </span>
      </label>

      <ContactPickerField
        id="sched-contact"
        label={t('create_scheduled.contact')}
        value={contactId ?? ''}
        onChange={setContactId}
        contacts={contactList}
        helperText={t('create_scheduled.contact_helper')}
      />

      <SelectField
        id="sched-account"
        label={t('create_scheduled.default_account')}
        value={accountId ?? ''}
        onChange={setAccountId}
        options={accountOptions}
        helperText={t('create_scheduled.default_account_helper')}
      />

      <SelectField<string>
        id="sched-category"
        label={t('create_scheduled.category')}
        value={categoryRef === '' ? null : categoryRef}
        onChange={(next) => setCategoryRef(next ?? '')}
        options={categoryOptions}
        helperText={t('create_scheduled.optional')}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sched-start">{t('create_scheduled.start_date')}</Label>
          <DatePicker
            id="sched-start"
            value={startDate}
            onChange={setStartDate}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sched-end">{t('create_scheduled.end_date')}</Label>
          <DatePicker
            id="sched-end"
            value={endDate}
            onChange={setEndDate}
            clearable
            min={startDate}
          />
        </div>
      </div>
      {!endDateValid ? (
        <p className="text-[12px] text-destructive">
          {t('create_scheduled.end_after_start')}
        </p>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          {t('create_scheduled.reminder_time_hint')}
        </p>
      )}

      {create.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(create.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isValid || create.isPending}
      >
        {create.isPending ? <Spinner /> : null}
        {t('common.save')}
      </Button>
    </form>
  );
}

function isoToday(): string {
  const now = new Date();
  const y = now.getFullYear().toString().padStart(4, '0');
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Split the encoded picker value back into the request fields the
 * backend expects. Identical to the helper inside IncomeForm /
 * ExpenseForm so we stay consistent across forms.
 */
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
