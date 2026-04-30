import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Repeat,
  type LucideIcon,
} from 'lucide-react';
import type {
  RecurrenceType,
  ScheduledReminderStatus,
  ScheduledStatus,
} from '@/types/scheduled.types';

export const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  once: 'Bir marta',
  daily: 'Har kuni',
  weekly: 'Har hafta',
  monthly: 'Har oy',
  yearly: 'Har yil',
};

export const RECURRENCE_ICON: Record<RecurrenceType, LucideIcon> = {
  once: Clock,
  daily: Calendar,
  weekly: CalendarRange,
  monthly: CalendarDays,
  yearly: Repeat,
};

export const SCHEDULED_STATUS_LABEL: Record<ScheduledStatus, string> = {
  active: 'Faol',
  paused: "To'xtatilgan",
  ended: 'Tugagan',
  cancelled: 'Bekor qilingan',
};

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

export const REMINDER_STATUS_LABEL: Record<ScheduledReminderStatus, string> = {
  pending: 'Kutilmoqda',
  notified: 'Yuborildi',
  confirmed: 'Tasdiqlandi',
  skipped: "O'tkazildi",
};

export const REMINDER_STATUS_VARIANT: Record<
  ScheduledReminderStatus,
  'default' | 'secondary' | 'destructive' | 'success'
> = {
  pending: 'default',
  notified: 'secondary',
  confirmed: 'success',
  skipped: 'destructive',
};
