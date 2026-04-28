import { api } from './client';
import type {
  CreateTransferRequest,
  Transaction,
} from '@/types/transaction.types';

const BASE = '/web/transfers';

export const transfersApi = {
  async create(body: CreateTransferRequest): Promise<Transaction> {
    const { data } = await api.post<Transaction>(BASE, body);
    return data;
  },
};
