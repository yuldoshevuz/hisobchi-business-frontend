import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  SkipForward,
} from 'lucide-react';
import {
  useConfirmScheduledReminder,
  useScheduledById,
  useSkipScheduledReminder,
} from '@/api/hooks/use-scheduled';
import { useAccounts } from '@/api/hooks/use-accounts';
import {
  formatAmount,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import { SelectField } from '@/components/transactions/forms/form-primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { TRANSACTION_TYPE_LABEL } from '@/lib/transaction-meta';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  RECURRENCE_LABEL,
  REMINDER_STATUS_LABEL,
} from './scheduled-meta';
import type { Scheduled, ScheduledReminder } from '@/types/scheduled.types';

interface ReminderDetailModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  reminder: ScheduledReminder;
  /**
   * The parent scheduled row. Optional because the dashboard reminder
   * carousel may render before the plans query resolves; the modal then
   * fetches it itself via `useScheduledById`.
   */
  plan?: Scheduled;
}

/**
 * Self-contained reminder detail + actions sheet. Replaces the bot's
 * inline-keyboard flow — the bot now just deep-links here. The user can:
 *   • see the full plan context (amount, recurrence, status, due date),
 *   • confirm, optionally overriding the amount or destination account,
 *   • skip the occurrence (advances the schedule without producing a
 *     transaction),
 *   • jump into the full scheduled list for further admin work.
 *
 * Confirm is the heavyweight path: it dispatches to the matching business
 * service server-side (sales / expenses / debts / ...). When the parent
 * plan has `amount: null` the form forces an amount input — the backend
 * rejects empty amounts in that case (see `ScheduledDispatcherService`).
 */
export function ReminderDetailModal({
  open,
  onOpenChange,
  reminder,
  plan: planProp,
}: ReminderDetailModalProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Fetch the plan if the caller didn't pass it. Lazy-enabled so we don't
  // make a request when the modal isn't open.
  const planQuery = useScheduledById(planProp ? null : reminder.scheduledId);
  const plan = planProp ?? planQuery.data;

  const accounts = useAccounts({ status: 'active' });
  const skip = useSkipScheduledReminder();
  const confirm = useConfirmScheduledReminder();

  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [editing, setEditing] = useState<boolean>(false);

  // Reset local edit state whenever a new reminder is loaded so leftover
  // input from a previous open doesn't bleed across cards in the carousel.
  useEffect(() => {
    if (!open) {
      setAmount('');
      setAccountId(null);
      setEditing(false);
    }
  }, [open, reminder.id]);

  const requiresAmount = plan?.amount === null;
  const overdue = reminder.dueDate < isoToday();

  const accountOptions = useMemo(
    () =>
      (accounts.data ?? []).map((a) => ({
        value: a.id,
        label: a.name,
        description: a.currency,
      })),
    [accounts.data],
  );

  const canSkip =
    reminder.status === 'pending' || reminder.status === 'notified';
  const canConfirm = canSkip && plan !== undefined;

  const trimmedAmount = amount.trim();
  const amountValid =
    !requiresAmount ||
    (trimmedAmount !== '' &&
      Number.isFinite(Number(trimmedAmount)) &&
      Number(trimmedAmount) > 0);

  function handleSkip(): void {
    tgHapticImpact('medium');
    skip.mutate(reminder.id, {
      onSuccess: () => {
        tgHapticNotify('success');
        onOpenChange(false);
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  function handleConfirm(): void {
    if (!plan) return;
    if (requiresAmount && !amountValid) {
      // Force the inline form open so the user sees the missing field.
      setEditing(true);
      return;
    }
    const body: { amount?: string; accountId?: number } = {};
    if (trimmedAmount !== '' && plan.amount !== trimmedAmount) {
      body.amount = trimmedAmount;
    }
    if (accountId !== null && accountId !== plan.defaultAccountId) {
      body.accountId = accountId;
    }
    tgHapticImpact('heavy');
    confirm.mutate(
      { id: reminder.id, body },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onOpenChange(false);
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }

  function handleOpenInList(): void {
    tgHapticImpact('light');
    onOpenChange(false);
    navigate('/scheduled');
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={plan?.description ?? t('reminder_detail.plan_placeholder', { id: reminder.scheduledId })}
      description={plan ? TRANSACTION_TYPE_LABEL[plan.type] : t('reminder_detail.fallback_description')}
    >
      <div className="space-y-3">
        <div className="space-y-2 rounded-xl bg-muted/40 px-3 py-3 text-[13px]">
          <Row label={t('reminder_detail.date')} value={formatDateUz(reminder.dueDate, t)} />
          {plan ? (
            <>
              <Row
                label={t('reminder_detail.amount')}
                value={
                  plan.amount !== null
                    ? `${formatMoney(plan.amount, plan.currency)} ${plan.currency}`
                    : t('reminder_detail.amount_on_confirm')
                }
              />
              <Row
                label={t('reminder_detail.recurrence')}
                value={RECURRENCE_LABEL[plan.recurrenceType]}
              />
            </>
          ) : null}
          <Row label={t('reminder_detail.status')} value={REMINDER_STATUS_LABEL[reminder.status]} />
        </div>

        {overdue ? (
          <div className="flex items-start gap-2 rounded-xl border border-destructive bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {t('reminder_detail.overdue_message')}
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span className="text-foreground">
              {t('reminder_detail.confirm_message')}
            </span>
          </div>
        )}

        {canConfirm && editing ? (
          <div className="space-y-3 rounded-xl border border-border bg-card p-3">
            {requiresAmount || plan!.amount !== null ? (
              <div className="space-y-1.5">
                <Label htmlFor="reminder-amount">
                  {t('reminder_detail.amount')}{' '}
                  <span className="text-muted-foreground">
                    ({plan!.currency})
                  </span>
                  {requiresAmount ? ' *' : null}
                </Label>
                <Input
                  id="reminder-amount"
                  inputMode="decimal"
                  value={formatAmount(amount)}
                  onChange={(e) => setAmount(unformatAmount(e.target.value))}
                  placeholder={
                    plan!.amount !== null ? formatMoney(plan!.amount) : '0'
                  }
                  autoFocus
                />
                {!requiresAmount ? (
                  <p className="text-[12px] text-muted-foreground">
                    {t('reminder_detail.amount_blank_hint')}
                  </p>
                ) : null}
              </div>
            ) : null}

            <SelectField
              id="reminder-account"
              label={t('reminder_detail.account')}
              value={accountId ?? plan!.defaultAccountId ?? ''}
              onChange={setAccountId}
              options={accountOptions}
              helperText={t('reminder_detail.account_helper')}
            />
          </div>
        ) : null}

        {(skip.isError || confirm.isError) && (
          <p className="text-[13px] text-destructive">
            {getApiErrorMessage(skip.error ?? confirm.error)}
          </p>
        )}

        <div className="space-y-2">
          {canConfirm ? (
            editing ? (
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={handleConfirm}
                disabled={!amountValid || confirm.isPending}
              >
                {confirm.isPending ? <Spinner /> : <Check className="h-4 w-4" />}
                {t('reminder_detail.confirm')}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => {
                  if (requiresAmount) {
                    tgHapticImpact('light');
                    setEditing(true);
                    return;
                  }
                  handleConfirm();
                }}
                disabled={confirm.isPending}
              >
                {confirm.isPending ? <Spinner /> : <Check className="h-4 w-4" />}
                {requiresAmount ? t('reminder_detail.confirm_with_amount') : t('reminder_detail.confirm')}
              </Button>
            )
          ) : null}

          <div className="flex gap-2">
            {canConfirm && !editing ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => {
                  tgHapticImpact('light');
                  setEditing(true);
                }}
              >
                {t('reminder_detail.edit')}
              </Button>
            ) : null}
            {canConfirm && editing ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => {
                  tgHapticImpact('light');
                  setEditing(false);
                  setAmount('');
                  setAccountId(null);
                }}
              >
                {t('common.cancel')}
              </Button>
            ) : null}
            {canSkip ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="flex-1"
                onClick={handleSkip}
                disabled={skip.isPending}
              >
                {skip.isPending ? <Spinner /> : <SkipForward className="h-4 w-4" />}
                {t('reminder_detail.skip')}
              </Button>
            ) : null}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full text-[13px] text-muted-foreground"
            onClick={handleOpenInList}
          >
            {t('reminder_detail.open_in_list')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface RowProps {
  label: string;
  value: string;
}

function Row({ label, value }: RowProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;

function formatDateUz(iso: string, tFn: TFunction): string {
  const [datePart] = iso.split('T');
  const [y, m, d] = (datePart ?? '').split('-').map((p) => Number(p));
  if (!y || !m || !d) return iso;
  return `${d.toString().padStart(2, '0')} ${tFn(`reminder_detail.month.${MONTH_KEYS[m - 1]}`)} ${y}`;
}

function isoToday(): string {
  const now = new Date();
  const y = now.getFullYear().toString().padStart(4, '0');
  const mo = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${mo}-${d}`;
}
