import { api } from './client';
import type {
  Account,
  CreateAccountRequest,
  ListAccountsQuery,
  UpdateAccountRequest,
} from '@/types/account.types';

const BASE = '/web/accounts';

export const accountsApi = {
  async list(query: ListAccountsQuery = {}): Promise<Account[]> {
    const { data } = await api.get<Account[]>(BASE, { params: query });
    return data;
  },
  async getById(id: number): Promise<Account> {
    const { data } = await api.get<Account>(`${BASE}/${id}`);
    return data;
  },
  async create(body: CreateAccountRequest): Promise<Account> {
    const { data } = await api.post<Account>(BASE, body);
    return data;
  },
  async update(id: number, body: UpdateAccountRequest): Promise<Account> {
    const { data } = await api.patch<Account>(`${BASE}/${id}`, body);
    return data;
  },
  async archive(id: number): Promise<Account> {
    const { data } = await api.post<Account>(`${BASE}/${id}/archive`);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
