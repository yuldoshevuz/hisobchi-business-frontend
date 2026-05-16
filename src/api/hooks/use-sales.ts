import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { salesApi } from '@/api/sales.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  AddPaymentRequest,
  CreateSaleRequest,
  ListSalesQuery,
  PaginatedTransactions,
  Transaction,
} from '@/types/transaction.types';

const DEFAULT_PAGE_SIZE = 30;

async function invalidateAfterSale(
  queryContact: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await Promise.all([
    queryContact.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.sales.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.accounts.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.products.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.categories.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.clients.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.reports.all }),
  ]);
}

export function useSales(
  query: ListSalesQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PaginatedTransactions, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PaginatedTransactions, Error>({
    queryKey: queryKeys.sales.list(query),
    queryFn: () => salesApi.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSalesInfinite(
  query: Omit<ListSalesQuery, 'page'> = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useInfiniteQuery<PaginatedTransactions, Error>> {
  const callerEnabled = options.enabled ?? true;
  const limit = query.limit ?? DEFAULT_PAGE_SIZE;
  return useInfiniteQuery<PaginatedTransactions, Error>({
    queryKey: queryKeys.sales.list({ ...query, limit }),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      salesApi.list({ ...query, page: pageParam as number, limit }),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSale(
  id: number | null,
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<Transaction, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<Transaction, Error>({
    queryKey: queryKeys.sales.detail(id ?? 0),
    queryFn: () => salesApi.getById(id as number),
    enabled:
      Boolean(tokenStore.getActiveOrgId()) && id !== null && callerEnabled,
    staleTime: 60_000,
  });
}

export function useCreateSale(): ReturnType<
  typeof useMutation<Transaction, Error, CreateSaleRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<Transaction, Error, CreateSaleRequest>({
    mutationFn: (body) => salesApi.create(body),
    onSuccess: async (created) => {
      queryContact.setQueryData(
        queryKeys.transactions.detail(created.id),
        created,
      );
      await invalidateAfterSale(queryContact);
    },
  });
}

interface AddSalePaymentVars {
  saleId: number;
  body: AddPaymentRequest;
}

export function useAddSalePayment(): ReturnType<
  typeof useMutation<Transaction, Error, AddSalePaymentVars>
> {
  const queryContact = useQueryClient();
  return useMutation<Transaction, Error, AddSalePaymentVars>({
    mutationFn: ({ saleId, body }) => salesApi.addPayment(saleId, body),
    onSuccess: async (updated) => {
      queryContact.setQueryData(
        queryKeys.transactions.detail(updated.id),
        updated,
      );
      await invalidateAfterSale(queryContact);
    },
  });
}
