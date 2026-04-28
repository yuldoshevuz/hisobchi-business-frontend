import { api } from './client';
import type {
  AddPaymentRequest,
  CreateDebtRequest,
  Transaction,
} from '@/types/transaction.types';

const BASE = '/web/debts';

export const debtsApi = {
  async create(body: CreateDebtRequest): Promise<Transaction> {
    const { data } = await api.post<Transaction>(BASE, body);
    return data;
  },
  async addRepayment(
    debtId: number,
    body: AddPaymentRequest,
  ): Promise<Transaction> {
    const { data } = await api.post<Transaction>(
      `${BASE}/${debtId}/repayments`,
      body,
    );
    return data;
  },
};
