import { api } from './client';
import type {
  AddPaymentRequest,
  CreateSaleRequest,
  ListSalesQuery,
  PaginatedTransactions,
  Transaction,
} from '@/types/transaction.types';

const BASE = '/web/sales';

function serializeListQuery(query: ListSalesQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.contactId !== undefined)
    params.set('contactId', String(query.contactId));
  if (query.accountId !== undefined)
    params.set('accountId', String(query.accountId));
  if (query.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query.dateTo) params.set('dateTo', query.dateTo);
  if (query.status) params.set('status', query.status);
  if (query.paymentStatus) params.set('paymentStatus', query.paymentStatus);
  if (query.search) params.set('search', query.search);
  return params;
}

export const salesApi = {
  async list(query: ListSalesQuery = {}): Promise<PaginatedTransactions> {
    const { data } = await api.get<PaginatedTransactions>(BASE, {
      params: serializeListQuery(query),
    });
    return data;
  },
  async getById(id: number): Promise<Transaction> {
    const { data } = await api.get<Transaction>(`${BASE}/${id}`);
    return data;
  },
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
