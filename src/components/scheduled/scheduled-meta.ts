import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Repeat,
  type LucideIcon,
} from 'lucide-react';
import i18n from '@/i18n';
import type {
  RecurrenceType,
  ScheduledReminderStatus,
  ScheduledStatus,
} from '@/types/scheduled.types';

const RECURRENCE_LABEL_KEY: Record<RecurrenceType, string> = {
  once: 'scheduled_meta.recurrence.once',
  daily: 'scheduled_meta.recurrence.daily',
  weekly: 'scheduled_meta.recurrence.weekly',
  monthly: 'scheduled_meta.recurrence.monthly',
  yearly: 'scheduled_meta.recurrence.yearly',
};

export const RECURRENCE_LABEL: Record<RecurrenceType, string> = new Proxy(
  RECURRENCE_LABEL_KEY,
  {
    get(target, prop: string) {
      const key = target[prop as RecurrenceType];
      return key ? i18n.t(key) : (prop as string);
    },
  },
) as Record<RecurrenceType, string>;

export const RECURRENCE_ICON: Record<RecurrenceType, LucideIcon> = {
  once: Clock,
  daily: Calendar,
  weekly: CalendarRange,
  monthly: CalendarDays,
  yearly: Repeat,
};

const SCHEDULED_STATUS_LABEL_KEY: Record<ScheduledStatus, string> = {
  active: 'scheduled_meta.status.active',
  paused: 'scheduled_meta.status.paused',
  ended: 'scheduled_meta.status.ended',
  cancelled: 'scheduled_meta.status.cancelled',
};

export const SCHEDULED_STATUS_LABEL: Record<ScheduledStatus, string> = new Proxy(
  SCHEDULED_STATUS_LABEL_KEY,
  {
    get(target, prop: string) {
      const key = target[prop as ScheduledStatus];
      return key ? i18n.t(key) : (prop as string);
    },
  },
) as Record<ScheduledStatus, string>;

/** Used by `Badge` variant prop on the scheduled row. */
export const SCHEDULED_STATUS_VARIANT: Record<
  ScheduledStatus,
  'default' | 'secondary' | 'destructive' | 'success'
> = {
  active: 'success',
  paused: 'secondary',
  ended: 'secondary',
  cancelled: 'destructive',
};

const REMINDER_STATUS_LABEL_KEY: Record<ScheduledReminderStatus, string> = {
  pending: 'scheduled_meta.reminder_status.pending',
  notified: 'scheduled_meta.reminder_status.notified',
  confirmed: 'scheduled_meta.reminder_status.confirmed',
  skipped: 'scheduled_meta.reminder_status.skipped',
};

export const REMINDER_STATUS_LABEL: Record<ScheduledReminderStatus, string> =
  new Proxy(REMINDER_STATUS_LABEL_KEY, {
    get(target, prop: string) {
      const key = target[prop as ScheduledReminderStatus];
      return key ? i18n.t(key) : (prop as string);
    },
  }) as Record<ScheduledReminderStatus, string>;

export const REMINDER_STATUS_VARIANT: Record<
  ScheduledReminderStatus,
  'default' | 'secondary' | 'destructive' | 'success'
> = {
  pending: 'default',
  notified: 'secondary',
  confirmed: 'success',
  skipped: 'destructive',
};
