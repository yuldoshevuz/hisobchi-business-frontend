import { api } from './client';
import type {
  CashFlow,
  ListTransactionsQuery,
  PaginatedTransactions,
  Transaction,
  VoidRequest,
} from '@/types/transaction.types';

const BASE = '/web/transactions';
const CASH_FLOW_BASE = '/web/cash-flows';

/**
 * Translate the rich list filter object into a `URLSearchParams` instance.
 * Backend expects single-value `accountId` / `paymentStatus` and a
 * comma-separated `type=` (or repeated). We build the params manually so axios
 * doesn't transform arrays into `key[]=...`.
 */
function serializeListQuery(query: ListTransactionsQuery): URLSearchParams {
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
  if (query.type && query.type.length > 0) {
    params.set('type', query.type.join(','));
  }
  return params;
}

/**
 * Read-only transactions API. There is no `create` here — every create flow
 * goes through a verb-per-operation module (`/sales`, `/purchases`, `/debts`,
 * `/transfers`, …). The unified ledger is read here, voided here, but never
 * written here.
 */
export const transactionsApi = {
  async list(query: ListTransactionsQuery = {}): Promise<PaginatedTransactions> {
    const { data } = await api.get<PaginatedTransactions>(BASE, {
      params: serializeListQuery(query),
    });
    return data;
  },
  async getById(id: number): Promise<Transaction> {
    const { data } = await api.get<Transaction>(`${BASE}/${id}`);
    return data;
  },
  async voidTransaction(
    transactionId: number,
    body: VoidRequest,
  ): Promise<Transaction> {
    const { data } = await api.post<Transaction>(
      `${BASE}/${transactionId}/void`,
      body,
    );
    return data;
  },
  async voidCashFlow(
    cashFlowId: number,
    body: VoidRequest,
  ): Promise<CashFlow> {
    const { data } = await api.post<CashFlow>(
      `${CASH_FLOW_BASE}/${cashFlowId}/void`,
      body,
    );
    return data;
  },
};
