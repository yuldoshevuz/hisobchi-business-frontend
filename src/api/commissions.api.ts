import { api } from './client';
import type {
  Commission,
  CommissionsSummaryRow,
  CreateCommissionRequest,
  ListCommissionsQuery,
  PaginatedCommissions,
  VoidCommissionRequest,
} from '@/types/commission.types';

const BASE = '/web/commissions';

export const commissionsApi = {
  async list(query: ListCommissionsQuery = {}): Promise<PaginatedCommissions> {
    const { data } = await api.get<PaginatedCommissions>(BASE, {
      params: query,
    });
    return data;
  },
  async summary(): Promise<CommissionsSummaryRow[]> {
    const { data } = await api.get<CommissionsSummaryRow[]>(`${BASE}/summary`);
    return data;
  },
  async getById(id: number): Promise<Commission> {
    const { data } = await api.get<Commission>(`${BASE}/${id}`);
    return data;
  },
  async create(body: CreateCommissionRequest): Promise<Commission> {
    const { data } = await api.post<Commission>(BASE, body);
    return data;
  },
  async void(id: number, body: VoidCommissionRequest = {}): Promise<Commission> {
    const { data } = await api.post<Commission>(`${BASE}/${id}/void`, body);
    return data;
  },
};
