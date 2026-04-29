import { api } from './client';
import type {
  AddPaymentRequest,
  CreateExpenseRequest,
  Transaction,
} from '@/types/transaction.types';

const BASE = '/web/expenses';

export const expensesApi = {
  async create(body: CreateExpenseRequest): Promise<Transaction> {
    const { data } = await api.post<Transaction>(BASE, body);
    return data;
  },
  async addPayment(
    expenseId: number,
    body: AddPaymentRequest,
  ): Promise<Transaction> {
    const { data } = await api.post<Transaction>(
      `${BASE}/${expenseId}/payments`,
      body,
    );
    return data;
  },
};
