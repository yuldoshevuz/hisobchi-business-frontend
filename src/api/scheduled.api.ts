import { api } from './client';
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

const BASE = '/web/scheduled';
const REMINDERS_BASE = '/web/scheduled-reminders';

export const scheduledApi = {
  async list(query: ListScheduledQuery = {}): Promise<PaginatedScheduled> {
    const { data } = await api.get<PaginatedScheduled>(BASE, { params: query });
    return data;
  },
  async getById(id: number): Promise<Scheduled> {
    const { data } = await api.get<Scheduled>(`${BASE}/${id}`);
    return data;
  },
  async create(body: CreateScheduledRequest): Promise<Scheduled> {
    const { data } = await api.post<Scheduled>(BASE, body);
    return data;
  },
  async update(id: number, body: UpdateScheduledRequest): Promise<Scheduled> {
    const { data } = await api.patch<Scheduled>(`${BASE}/${id}`, body);
    return data;
  },
  async pause(id: number): Promise<Scheduled> {
    const { data } = await api.post<Scheduled>(`${BASE}/${id}/pause`);
    return data;
  },
  async resume(id: number): Promise<Scheduled> {
    const { data } = await api.post<Scheduled>(`${BASE}/${id}/resume`);
    return data;
  },
  async cancel(id: number): Promise<Scheduled> {
    const { data } = await api.post<Scheduled>(`${BASE}/${id}/cancel`);
    return data;
  },
  reminders: {
    async list(
      query: ListScheduledRemindersQuery = {},
    ): Promise<PaginatedScheduledReminders> {
      const { data } = await api.get<PaginatedScheduledReminders>(
        REMINDERS_BASE,
        { params: query },
      );
      return data;
    },
    async getById(id: number): Promise<ScheduledReminder> {
      const { data } = await api.get<ScheduledReminder>(
        `${REMINDERS_BASE}/${id}`,
      );
      return data;
    },
    async skip(id: number): Promise<ScheduledReminder> {
      const { data } = await api.post<ScheduledReminder>(
        `${REMINDERS_BASE}/${id}/skip`,
      );
      return data;
    },
    async confirm(
      id: number,
      body: ConfirmReminderRequest = {},
    ): Promise<Transaction> {
      const { data } = await api.post<Transaction>(
        `${REMINDERS_BASE}/${id}/confirm`,
        body,
      );
      return data;
    },
  },
};
