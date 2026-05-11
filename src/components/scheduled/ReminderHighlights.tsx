import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
} from 'lucide-react';
import {
  useScheduled,
  useScheduledReminders,
} from '@/api/hooks/use-scheduled';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { TRANSACTION_TYPE_LABEL } from '@/lib/transaction-meta';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';
import {
  REMINDER_STATUS_LABEL,
  REMINDER_STATUS_VARIANT,
  RECURRENCE_LABEL,
} from './scheduled-meta';
import { ReminderDetailModal } from './ReminderDetailModal';
import type { Scheduled, ScheduledReminder } from '@/types/scheduled.types';

const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;

interface ReminderHighlightsProps {
  /**
   * When set (e.g. from a Telegram start-param deep-link), the modal for
   * that reminder opens automatically once the data lands. Cleared via
   * `onSelectionConsumed` after the open so a re-render doesn't keep
   * re-firing.
   */
  selectedReminderId?: number | null;
  onSelectionConsumed?: () => void;
}

/**
 * Eye-catching carousel of unresolved reminders for the dashboard. Pulls
 * `pending` + `notified` reminders separately (the API filters by a single
 * status at a time) and merges them into one ordered list — newest dueDate
 * first, since users care about what's about to fire next.
 *
 * Renders nothing when there are no live reminders, so it's a no-op for orgs
 * that don't use the scheduled module yet. A single reminder gets the full
 * card width; >1 turns into a swipeable scroll-snap carousel.
 *
 * Tapping a card opens a detail modal scoped to that reminder. The modal
 * itself is the action surface — confirm + skip + edit live there, so the
 * bot's inline keyboards aren't needed.
 */
export function ReminderHighlights({
  selectedReminderId,
  onSelectionConsumed,
}: ReminderHighlightsProps = {}): React.ReactElement | null {
  const { t } = useTranslation();
  const pending = useScheduledReminders({ status: 'pending', limit: 20 });
  const notified = useScheduledReminders({ status: 'notified', limit: 20 });
  const plans = useScheduled({ status: 'active', limit: 100 });

  const reminders: ScheduledReminder[] = [
    ...(pending.data?.data ?? []),
    ...(notified.data?.data ?? []),
  ].sort((a, b) => (a.dueDate < b.dueDate ? 1 : a.dueDate > b.dueDate ? -1 : 0));

  const [activeReminderId, setActiveReminderId] = useState<number | null>(null);

  // Honour an externally-driven selection (deep-link). Once the reminder
  // exists in the merged list and we open it, tell the parent so it can
  // clear the URL/start-param state — re-renders shouldn't keep re-opening.
  useEffect(() => {
    if (
      selectedReminderId !== null &&
      selectedReminderId !== undefined &&
      reminders.some((r) => r.id === selectedReminderId)
    ) {
      setActiveReminderId(selectedReminderId);
      onSelectionConsumed?.();
    }
  }, [selectedReminderId, reminders, onSelectionConsumed]);

  if (pending.isPending || notified.isPending) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (reminders.length === 0) return null;

  const planById = new Map(
    (plans.data?.data ?? []).map((p) => [p.id, p] as const),
  );
  const isCarousel = reminders.length > 1;
  const activeReminder = reminders.find((r) => r.id === activeReminderId) ?? null;

  return (
    <div className="space-y-2 px-4">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[14px] font-semibold uppercase tracking-wide text-destructive">
          {t('reminder_highlights.title')}
        </h2>
        <Badge variant="destructive" className="text-[11px]">
          {reminders.length}
        </Badge>
      </div>

      {isCarousel ? (
        <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex snap-x snap-mandatory gap-3">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="w-[88%] shrink-0 snap-start last:pr-1"
              >
                <ReminderCard
                  reminder={r}
                  plan={planById.get(r.scheduledId)}
                  tFn={t}
                  onTap={() => setActiveReminderId(r.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ReminderCard
          reminder={reminders[0]!}
          plan={planById.get(reminders[0]!.scheduledId)}
          tFn={t}
          onTap={() => setActiveReminderId(reminders[0]!.id)}
        />
      )}

      {activeReminder ? (
        <ReminderDetailModal
          open={activeReminderId !== null}
          onOpenChange={(o) => {
            if (!o) setActiveReminderId(null);
          }}
          reminder={activeReminder}
          plan={planById.get(activeReminder.scheduledId)}
        />
      ) : null}
    </div>
  );
}

interface ReminderCardProps {
  reminder: ScheduledReminder;
  plan: Scheduled | undefined;
  tFn: TFunction;
  onTap: () => void;
}

function ReminderCard({
  reminder,
  plan,
  tFn,
  onTap,
}: ReminderCardProps): React.ReactElement {
  const overdue = reminder.dueDate < isoToday();

  // Reminders are intentionally always rendered with the destructive palette
  // — they are calls-to-action that need to grab attention even before the
  // due date passes. Overdue cards step it up further with a heavier border
  // and the AlertCircle icon.
  return (
    <button
      type="button"
      onClick={() => {
        tgHapticImpact('light');
        onTap();
      }}
      className={cn(
        'press flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition-colors active:bg-destructive/15',
        overdue
          ? 'border-destructive bg-destructive/10'
          : 'border-destructive/40 bg-destructive/5',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
          {overdue ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <CalendarClock className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-foreground">
              {plan?.description ?? tFn('reminder_highlights.plan_placeholder', { id: reminder.scheduledId })}
            </span>
            <Badge
              variant={REMINDER_STATUS_VARIANT[reminder.status]}
              className="shrink-0 text-[10px]"
            >
              {REMINDER_STATUS_LABEL[reminder.status]}
            </Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
            <span
              className={cn(
                'tabular-nums font-medium',
                overdue ? 'font-semibold text-destructive' : 'text-destructive/80',
              )}
            >
              {formatDateUz(reminder.dueDate, tFn)}
            </span>
            {plan ? (
              <>
                <span>·</span>
                <span>{TRANSACTION_TYPE_LABEL[plan.type]}</span>
                <span>·</span>
                <span>{RECURRENCE_LABEL[plan.recurrenceType]}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {plan && plan.amount !== null ? (
        <div className="flex items-end justify-between pt-1">
          <span className="text-[20px] font-bold tabular-nums text-foreground">
            {formatMoney(plan.amount, plan.currency)}{' '}
            <span className="text-[13px] font-normal text-muted-foreground">
              {plan.currency}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : (
        <div className="flex items-end justify-between pt-1">
          <Badge variant="secondary" className="text-[11px]">
            {tFn('reminder_highlights.amount_on_confirm')}
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </button>
  );
}

function formatDateUz(iso: string, tFn: TFunction): string {
  const [datePart] = iso.split('T');
  const [y, m, d] = (datePart ?? '').split('-').map((p) => Number(p));
  if (!y || !m || !d) return iso;
  return `${d.toString().padStart(2, '0')} ${tFn(`reminder_highlights.month.${MONTH_KEYS[m - 1]}`)} ${y}`;
}

function isoToday(): string {
  const now = new Date();
  const y = now.getFullYear().toString().padStart(4, '0');
  const mo = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${mo}-${d}`;
}
