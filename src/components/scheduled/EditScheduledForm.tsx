import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateScheduled } from '@/api/hooks/use-scheduled';
import {
  formatAmount,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticNotify } from '@/lib/telegram';
import type {
  Scheduled,
  UpdateScheduledRequest,
} from '@/types/scheduled.types';

interface EditScheduledFormProps {
  scheduled: Scheduled;
  onClose: () => void;
}

/**
 * Edit form covers only mutable fields: amount (or "ask on confirm"),
 * description, end date. The `type` and `recurrenceType` are intentionally
 * locked because changing them mid-flight would invalidate every reminder
 * already generated (per backend §UpdateScheduledDto). To change those,
 * cancel the schedule and create a new one.
 */
export function EditScheduledForm({
  scheduled,
  onClose,
}: EditScheduledFormProps): React.ReactElement {
  const { t } = useTranslation();
  const update = useUpdateScheduled();

  const [askOnConfirm, setAskOnConfirm] = useState<boolean>(
    scheduled.amount === null,
  );
  const [amount, setAmount] = useState<string>(scheduled.amount ?? '');
  const [description, setDescription] = useState<string>(scheduled.description);
  const [endDate, setEndDate] = useState<string>(scheduled.endDate ?? '');

  const trimmedAmount = amount.trim();
  const trimmedDescription = description.trim();
  const trimmedEndDate = endDate.trim();

  const amountValid =
    askOnConfirm ||
    (trimmedAmount !== '' &&
      Number.isFinite(Number(trimmedAmount)) &&
      Number(trimmedAmount) > 0);

  const endDateValid =
    trimmedEndDate === '' || trimmedEndDate >= scheduled.nextOccurrence;

  const isValid =
    trimmedDescription.length > 0 && amountValid && endDateValid;

  const submit = useCallback((): void => {
    if (!isValid) return;
    const body: UpdateScheduledRequest = {};
    const newAmount = askOnConfirm ? null : trimmedAmount;
    if (newAmount !== scheduled.amount) body.amount = newAmount;
    if (trimmedDescription !== scheduled.description) {
      body.description = trimmedDescription;
    }
    const nextEndDate = trimmedEndDate || null;
    if (nextEndDate !== scheduled.endDate) {
      body.endDate = nextEndDate;
    }
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    update.mutate(
      { id: scheduled.id, body },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [
    isValid,
    update,
    askOnConfirm,
    trimmedAmount,
    trimmedDescription,
    trimmedEndDate,
    scheduled,
    onClose,
  ]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="edit-sched-description">
          {t('edit_scheduled.description')}
        </Label>
        <Input
          id="edit-sched-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-sched-amount">
          {t('edit_scheduled.amount_label', { currency: scheduled.currency })}
        </Label>
        <Input
          id="edit-sched-amount"
          inputMode="decimal"
          value={formatAmount(amount)}
          onChange={(e) => setAmount(unformatAmount(e.target.value))}
          placeholder="0"
          disabled={askOnConfirm}
        />
      </div>

      <label
        htmlFor="edit-sched-ask"
        className="press flex cursor-pointer items-start gap-3 rounded-xl border border-input bg-card px-3 py-2.5 active:bg-accent"
      >
        <Checkbox
          id="edit-sched-ask"
          className="mt-1"
          checked={askOnConfirm}
          onCheckedChange={(v) => setAskOnConfirm(v === true)}
        />
        <span className="flex-1">
          <span className="block text-[14px] font-medium leading-tight">
            {t('edit_scheduled.ask_on_confirm_title')}
          </span>
          <span className="mt-0.5 block text-[12px] text-muted-foreground">
            {t('edit_scheduled.ask_on_confirm_description')}
          </span>
        </span>
      </label>

      <div className="space-y-1.5">
        <Label htmlFor="edit-sched-end">{t('edit_scheduled.end_date')}</Label>
        <DatePicker
          id="edit-sched-end"
          value={endDate}
          onChange={setEndDate}
          clearable
          min={scheduled.nextOccurrence}
        />
        {!endDateValid ? (
          <p className="text-[12px] text-destructive">
            {t('edit_scheduled.end_date_invalid')}
          </p>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            {t('edit_scheduled.end_date_empty')}
          </p>
        )}
      </div>

      {update.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(update.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isValid || update.isPending}
      >
        {update.isPending ? <Spinner /> : null}
        {t('common.save')}
      </Button>
    </form>
  );
}
