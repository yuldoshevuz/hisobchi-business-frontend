import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduledApi } from '@/api/scheduled.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  ConfirmReminderRequest,
  CreateScheduledRequest,
  ListScheduledQuery,
  ListScheduledRemindersQuery,
  PaginatedScheduled,
  PaginatedScheduledReminders,
  Scheduled,
  ScheduledReminder,
  UpdateScheduledRequest,
} from '@/types/scheduled.types';
import type { Transaction } from '@/types/transaction.types';

export function useScheduled(
  query: ListScheduledQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PaginatedScheduled, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PaginatedScheduled, Error>({
    queryKey: queryKeys.scheduled.list(query),
    queryFn: () => scheduledApi.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useScheduledById(
  id: number | null,
): ReturnType<typeof useQuery<Scheduled, Error>> {
  return useQuery<Scheduled, Error>({
    queryKey: queryKeys.scheduled.detail(id ?? 0),
    queryFn: () => scheduledApi.getById(id as number),
    enabled: Boolean(tokenStore.getActiveOrgId()) && id !== null,
  });
}

export function useCreateScheduled(): ReturnType<
  typeof useMutation<Scheduled, Error, CreateScheduledRequest>
> {
  const qc = useQueryClient();
  return useMutation<Scheduled, Error, CreateScheduledRequest>({
    mutationFn: (body) => scheduledApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.scheduled.all });
    },
  });
}

interface UpdateScheduledVars {
  id: number;
  body: UpdateScheduledRequest;
}

export function useUpdateScheduled(): ReturnType<
  typeof useMutation<Scheduled, Error, UpdateScheduledVars>
> {
  const qc = useQueryClient();
  return useMutation<Scheduled, Error, UpdateScheduledVars>({
    mutationFn: ({ id, body }) => scheduledApi.update(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.scheduled.all });
    },
  });
}

/**
 * Lifecycle transitions (pause / resume / cancel) share the same shape:
 * single id in, refreshed Scheduled out, list invalidation. Wrapped in one
 * factory so the page can pick whichever it needs without three near-identical
 * declarations.
 */
function useLifecycleMutation(
  fn: (id: number) => Promise<Scheduled>,
): ReturnType<typeof useMutation<Scheduled, Error, number>> {
  const qc = useQueryClient();
  return useMutation<Scheduled, Error, number>({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.scheduled.all });
    },
  });
}

export function usePauseScheduled(): ReturnType<
  typeof useMutation<Scheduled, Error, number>
> {
  return useLifecycleMutation(scheduledApi.pause);
}

export function useResumeScheduled(): ReturnType<
  typeof useMutation<Scheduled, Error, number>
> {
  return useLifecycleMutation(scheduledApi.resume);
}

export function useCancelScheduled(): ReturnType<
  typeof useMutation<Scheduled, Error, number>
> {
  return useLifecycleMutation(scheduledApi.cancel);
}

export function useScheduledReminders(
  query: ListScheduledRemindersQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PaginatedScheduledReminders, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PaginatedScheduledReminders, Error>({
    queryKey: queryKeys.scheduled.reminders.list(query),
    queryFn: () => scheduledApi.reminders.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useSkipScheduledReminder(): ReturnType<
  typeof useMutation<ScheduledReminder, Error, number>
> {
  const qc = useQueryClient();
  return useMutation<ScheduledReminder, Error, number>({
    mutationFn: (id) => scheduledApi.reminders.skip(id),
    onSuccess: () => {
      // Skipping a reminder advances the parent schedule, so both lists
      // become stale together.
      void qc.invalidateQueries({
        queryKey: queryKeys.scheduled.reminders.all,
      });
      void qc.invalidateQueries({ queryKey: queryKeys.scheduled.all });
    },
  });
}

interface ConfirmReminderVars {
  id: number;
  body?: ConfirmReminderRequest;
}

/**
 * Dashboard-side reminder confirmation: posts to the web confirm endpoint
 * which dispatches into the matching business service. The
 * `transaction.created` listener marks the reminder confirmed and advances
 * the parent schedule, so we invalidate both reminder + scheduled caches AND
 * the transactions cache (a new tx just landed).
 */
export function useConfirmScheduledReminder(): ReturnType<
  typeof useMutation<Transaction, Error, ConfirmReminderVars>
> {
  const qc = useQueryClient();
  return useMutation<Transaction, Error, ConfirmReminderVars>({
    mutationFn: ({ id, body }) => scheduledApi.reminders.confirm(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.scheduled.reminders.all,
      });
      void qc.invalidateQueries({ queryKey: queryKeys.scheduled.all });
      void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}
