import { api } from './client';
import type {
  AddPaymentRequest,
  CreateSaleRequest,
  Transaction,
} from '@/types/transaction.types';

const BASE = '/web/sales';

export const salesApi = {
  async create(body: CreateSaleRequest): Promise<Transaction> {
    const { data } = await api.post<Transaction>(BASE, body);
    return data;
  },
  async addPayment(
    saleId: number,
    body: AddPaymentRequest,
  ): Promise<Transaction> {
    const { data } = await api.post<Transaction>(
      `${BASE}/${saleId}/payments`,
      body,
    );
    return data;
  },
};
