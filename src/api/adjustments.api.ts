import { api } from './client';
import type {
  CreateAdjustmentRequest,
  Transaction,
} from '@/types/transaction.types';

const BASE = '/web/adjustments';

export const adjustmentsApi = {
  async create(body: CreateAdjustmentRequest): Promise<Transaction> {
    const { data } = await api.post<Transaction>(BASE, body);
    return data;
  },
};
