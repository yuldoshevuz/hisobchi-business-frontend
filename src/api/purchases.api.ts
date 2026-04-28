import { api } from './client';
import type {
  AddPaymentRequest,
  CreatePurchaseRequest,
  Transaction,
} from '@/types/transaction.types';

const BASE = '/web/purchases';

export const purchasesApi = {
  async create(body: CreatePurchaseRequest): Promise<Transaction> {
    const { data } = await api.post<Transaction>(BASE, body);
    return data;
  },
  async addPayment(
    purchaseId: number,
    body: AddPaymentRequest,
  ): Promise<Transaction> {
    const { data } = await api.post<Transaction>(
      `${BASE}/${purchaseId}/payments`,
      body,
    );
    return data;
  },
};
