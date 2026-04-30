import { useCallback, useMemo, useState } from 'react';
import { useAccounts } from '@/api/hooks/use-accounts';
import { useCategories } from '@/api/hooks/use-categories';
import { useContacts } from '@/api/hooks/use-contacts';
import { useCreateScheduled } from '@/api/hooks/use-scheduled';
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
  const create = useCreateScheduled();
  const accounts = useAccounts({ status: 'active' });
  const contacts = useContacts({ status: 'active', all: true });
  const categories = useCategories({ all: true });

  const [type, setType] = useState<ScheduledType>('expense');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('monthly');
  const [askOnConfirm, setAskOnConfirm] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('UZS');
  const [description, setDescription] = useState<string>('');
  const [contactId, setContactId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>(isoToday());
  const [endDate, setEndDate] = useState<string>('');

  const accountList = accounts.data ?? [];
  const contactList = contacts.data?.data ?? [];
  // The merged-catalog endpoint returns rows with `id === null` for system
  // defaults the org hasn't customised yet — those still pick fine via
  // `systemCategoryId`, but for the simple recurring picker we only show
  // already-instantiated rows (id !== null) to avoid passing both keys.
  const categoryList = (categories.data?.data ?? []).filter(
    (c) => c.id !== null,
  );

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
      ...(categoryId !== null ? { categoryId } : {}),
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
    categoryId,
    contactId,
    accountId,
    trimmedEndDate,
    onClose,
  ]);

  const typeOptions = useMemo(
    () =>
      SCHEDULED_TYPE_VALUES.map((t) => ({
        value: t,
        label: TRANSACTION_TYPE_LABEL[t],
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

  const categoryOptions = useMemo(
    () =>
      categoryList.map((c) => ({
        value: c.id as number,
        label: c.name,
      })),
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
        label="Turi"
        value={type}
        onChange={(next) => next && setType(next as ScheduledType)}
        options={typeOptions}
      />

      <SelectField
        id="sched-recurrence"
        label="Takrorlanish"
        value={recurrence}
        onChange={(next) => next && setRecurrence(next as RecurrenceType)}
        options={recurrenceOptions}
      />

      <div className="space-y-1.5">
        <Label htmlFor="sched-description">Tavsif</Label>
        <Input
          id="sched-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Masalan: Ofis ijarasi"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sched-amount">Summa</Label>
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
          <Label>Valyuta</Label>
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
            Summa har safar so'ralsin
          </span>
          <span className="mt-0.5 block text-[12px] text-muted-foreground">
            Masalan: kommunal to'lovlar — har oy summa har xil bo'lganda.
          </span>
        </span>
      </label>

      <ContactPickerField
        id="sched-contact"
        label="Kontakt"
        value={contactId ?? ''}
        onChange={setContactId}
        contacts={contactList}
        helperText="Ixtiyoriy. Qarz turlarida foydali bo'ladi."
      />

      <SelectField
        id="sched-account"
        label="Standart hisob"
        value={accountId ?? ''}
        onChange={setAccountId}
        options={accountOptions}
        helperText="Ixtiyoriy. Tasdiqlashda boshqa hisob ham tanlash mumkin."
      />

      <SelectField
        id="sched-category"
        label="Kategoriya"
        value={categoryId ?? ''}
        onChange={setCategoryId}
        options={categoryOptions}
        helperText="Ixtiyoriy"
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sched-start">Boshlanish *</Label>
          <DatePicker
            id="sched-start"
            value={startDate}
            onChange={setStartDate}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sched-end">Tugash sanasi</Label>
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
          Tugash sanasi boshlanishdan keyin bo'lishi kerak
        </p>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          ℹ️ Eslatma har kuni 00:15 (Toshkent) da yuboriladi. Bugungi sana tanlasangiz,
          birinchi eslatma ertaga keladi.
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
        Saqlash
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
