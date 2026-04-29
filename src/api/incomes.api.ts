import { api } from './client';
import type {
  AddPaymentRequest,
  CreateIncomeRequest,
  Transaction,
} from '@/types/transaction.types';

const BASE = '/web/incomes';

export const incomesApi = {
  async create(body: CreateIncomeRequest): Promise<Transaction> {
    const { data } = await api.post<Transaction>(BASE, body);
    return data;
  },
  async addPayment(
    incomeId: number,
    body: AddPaymentRequest,
  ): Promise<Transaction> {
    const { data } = await api.post<Transaction>(
      `${BASE}/${incomeId}/payments`,
      body,
    );
    return data;
  },
};
