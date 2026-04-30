import type { PaginatedResponse } from './member.types';
import type { TransactionType } from './transaction.types';

export type RecurrenceType =
  | 'once'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly';

export const RECURRENCE_TYPE_VALUES: readonly RecurrenceType[] = [
  'once',
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const;

export type ScheduledStatus = 'active' | 'paused' | 'ended' | 'cancelled';

export const SCHEDULED_STATUS_VALUES: readonly ScheduledStatus[] = [
  'active',
  'paused',
  'ended',
  'cancelled',
] as const;

export type ScheduledReminderStatus =
  | 'pending'
  | 'notified'
  | 'confirmed'
  | 'skipped';

export const SCHEDULED_REMINDER_STATUS_VALUES: readonly ScheduledReminderStatus[] =
  ['pending', 'notified', 'confirmed', 'skipped'] as const;

/** Subset of `TransactionType` that the scheduled-create form exposes. */
export type ScheduledType = TransactionType;

export interface Scheduled {
  id: number;
  type: ScheduledType;
  amount: string | null;
  currency: string;
  description: string;
  categoryId: number | null;
  contactId: number | null;
  defaultAccountId: number | null;
  recurrenceType: RecurrenceType;
  nextOccurrence: string;
  endDate: string | null;
  lastTriggeredAt: string | null;
  status: ScheduledStatus;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListScheduledQuery {
  status?: ScheduledStatus;
  type?: ScheduledType;
  recurrenceType?: RecurrenceType;
  page?: number;
  limit?: number;
}

export interface CreateScheduledRequest {
  type: ScheduledType;
  amount?: string | null;
  currency: string;
  description: string;
  categoryId?: number;
  systemCategoryId?: number;
  contactId?: number;
  defaultAccountId?: number;
  recurrenceType: RecurrenceType;
  startDate: string;
  endDate?: string;
}

export interface UpdateScheduledRequest {
  amount?: string | null;
  currency?: string;
  description?: string;
  categoryId?: number | null;
  contactId?: number | null;
  defaultAccountId?: number | null;
  startDate?: string;
  endDate?: string | null;
}

export type PaginatedScheduled = PaginatedResponse<Scheduled>;

export interface ScheduledReminder {
  id: number;
  scheduledId: number;
  dueDate: string;
  status: ScheduledReminderStatus;
  notifiedAt: string | null;
  resolvedAt: string | null;
  resolvedTransactionId: number | null;
  createdAt: string;
}

export interface ListScheduledRemindersQuery {
  status?: ScheduledReminderStatus;
  scheduledId?: number;
  page?: number;
  limit?: number;
}

export type PaginatedScheduledReminders = PaginatedResponse<ScheduledReminder>;

export interface ConfirmReminderRequest {
  amount?: string;
  accountId?: number;
  contactId?: number;
}
