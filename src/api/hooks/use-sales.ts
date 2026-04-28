import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@/api/sales.api';
import { queryKeys } from '@/api/query-keys';
import type {
  AddPaymentRequest,
  CreateSaleRequest,
  Transaction,
} from '@/types/transaction.types';

async function invalidateAfterSale(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.clients.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
  ]);
}

export function useCreateSale(): ReturnType<
  typeof useMutation<Transaction, Error, CreateSaleRequest>
> {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, CreateSaleRequest>({
    mutationFn: (body) => salesApi.create(body),
    onSuccess: async (created) => {
      queryClient.setQueryData(
        queryKeys.transactions.detail(created.id),
        created,
      );
      await invalidateAfterSale(queryClient);
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
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, AddSalePaymentVars>({
    mutationFn: ({ saleId, body }) => salesApi.addPayment(saleId, body),
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        queryKeys.transactions.detail(updated.id),
        updated,
      );
      await invalidateAfterSale(queryClient);
    },
  });
}
