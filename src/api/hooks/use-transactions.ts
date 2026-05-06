import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { transactionsApi } from '@/api/transactions.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  CashFlow,
  ListTransactionsQuery,
  PaginatedTransactions,
  Transaction,
  UpdateTransactionRequest,
  VoidRequest,
} from '@/types/transaction.types';

const DEFAULT_PAGE_SIZE = 30;

export function useTransactions(
  query: ListTransactionsQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PaginatedTransactions, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PaginatedTransactions, Error>({
    queryKey: queryKeys.transactions.list(query),
    queryFn: () => transactionsApi.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useTransactionsInfinite(
  query: Omit<ListTransactionsQuery, 'page'> = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useInfiniteQuery<PaginatedTransactions, Error>> {
  const callerEnabled = options.enabled ?? true;
  const limit = query.limit ?? DEFAULT_PAGE_SIZE;
  return useInfiniteQuery<PaginatedTransactions, Error>({
    queryKey: queryKeys.transactions.list({ ...query, limit }),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      transactionsApi.list({ ...query, page: pageParam as number, limit }),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useTransaction(
  id: number | null,
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<Transaction, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<Transaction, Error>({
    queryKey: queryKeys.transactions.detail(id ?? 0),
    queryFn: () => transactionsApi.getById(id as number),
    enabled:
      Boolean(tokenStore.getActiveOrgId()) && id !== null && callerEnabled,
    staleTime: 60_000,
  });
}

interface VoidTransactionVars {
  transactionId: number;
  body: VoidRequest;
}

export function useVoidTransaction(): ReturnType<
  typeof useMutation<Transaction, Error, VoidTransactionVars>
> {
  const queryContact = useQueryClient();
  return useMutation<Transaction, Error, VoidTransactionVars>({
    mutationFn: ({ transactionId, body }) =>
      transactionsApi.voidTransaction(transactionId, body),
    onSuccess: async (updated) => {
      queryContact.setQueryData(
        queryKeys.transactions.detail(updated.id),
        updated,
      );
      await Promise.all([
        queryContact.invalidateQueries({ queryKey: queryKeys.transactions.all }),
        queryContact.invalidateQueries({ queryKey: queryKeys.accounts.all }),
        queryContact.invalidateQueries({ queryKey: queryKeys.products.all }),
        queryContact.invalidateQueries({ queryKey: queryKeys.clients.all }),
        queryContact.invalidateQueries({ queryKey: queryKeys.reports.all }),
      ]);
    },
  });
}

interface VoidCashFlowVars {
  cashFlowId: number;
  parentTransactionId: number;
  body: VoidRequest;
}

export function useVoidCashFlow(): ReturnType<
  typeof useMutation<CashFlow, Error, VoidCashFlowVars>
> {
  const queryContact = useQueryClient();
  return useMutation<CashFlow, Error, VoidCashFlowVars>({
    mutationFn: ({ cashFlowId, body }) =>
      transactionsApi.voidCashFlow(cashFlowId, body),
    onSuccess: async (_, vars) => {
      // Server returns only the cash_flow row; refetch the parent so the UI
      // sees the recomputed paid_amount / payment_status.
      await queryContact.invalidateQueries({
        queryKey: queryKeys.transactions.detail(vars.parentTransactionId),
      });
      await Promise.all([
        queryContact.invalidateQueries({ queryKey: queryKeys.transactions.all }),
        queryContact.invalidateQueries({ queryKey: queryKeys.accounts.all }),
        queryContact.invalidateQueries({ queryKey: queryKeys.reports.all }),
      ]);
    },
  });
}

/**
 * Confirm an AI-proposed `initial` transaction. Side-effects (cash flows,
 * stock movements, balance updates, commissions) are written atomically on
 * the backend; we just invalidate everything that could have moved.
 */
export function useConfirmTransaction(): ReturnType<
  typeof useMutation<Transaction, Error, { transactionId: number }>
> {
  const qc = useQueryClient();
  return useMutation<Transaction, Error, { transactionId: number }>({
    mutationFn: ({ transactionId }) => transactionsApi.confirm(transactionId),
    onSuccess: async (updated) => {
      qc.setQueryData(queryKeys.transactions.detail(updated.id), updated);
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.transactions.all }),
        qc.invalidateQueries({ queryKey: queryKeys.accounts.all }),
        qc.invalidateQueries({ queryKey: queryKeys.products.all }),
        qc.invalidateQueries({ queryKey: queryKeys.clients.all }),
        qc.invalidateQueries({ queryKey: queryKeys.reports.all }),
      ]);
    },
  });
}

/**
 * Cancel an AI-proposed `initial` transaction (soft-delete). Use POST /void
 * for already-active rows.
 */
export function useCancelTransaction(): ReturnType<
  typeof useMutation<void, Error, { transactionId: number }>
> {
  const qc = useQueryClient();
  return useMutation<void, Error, { transactionId: number }>({
    mutationFn: ({ transactionId }) => transactionsApi.cancel(transactionId),
    onSuccess: async (_, vars) => {
      qc.removeQueries({
        queryKey: queryKeys.transactions.detail(vars.transactionId),
      });
      await qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
  });
}

interface UpdateTransactionVars {
  transactionId: number;
  body: UpdateTransactionRequest;
}

/**
 * Field-level update for an `initial` (pre-confirm) or `active` row. Only
 * metadata-style fields. Cash flows, items, and stock are NOT touched here.
 */
export function useUpdateTransaction(): ReturnType<
  typeof useMutation<Transaction, Error, UpdateTransactionVars>
> {
  const qc = useQueryClient();
  return useMutation<Transaction, Error, UpdateTransactionVars>({
    mutationFn: ({ transactionId, body }) =>
      transactionsApi.update(transactionId, body),
    onSuccess: async (updated) => {
      qc.setQueryData(queryKeys.transactions.detail(updated.id), updated);
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.transactions.all }),
        qc.invalidateQueries({ queryKey: queryKeys.reports.all }),
      ]);
    },
  });
}
