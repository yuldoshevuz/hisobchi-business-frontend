import { useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from '@/api/purchases.api';
import { queryKeys } from '@/api/query-keys';
import type {
  AddPaymentRequest,
  CreatePurchaseRequest,
  Transaction,
} from '@/types/transaction.types';

async function invalidateAfterPurchase(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
  ]);
}

export function useCreatePurchase(): ReturnType<
  typeof useMutation<Transaction, Error, CreatePurchaseRequest>
> {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, CreatePurchaseRequest>({
    mutationFn: (body) => purchasesApi.create(body),
    onSuccess: async (created) => {
      queryClient.setQueryData(
        queryKeys.transactions.detail(created.id),
        created,
      );
      await invalidateAfterPurchase(queryClient);
    },
  });
}

interface AddPurchasePaymentVars {
  purchaseId: number;
  body: AddPaymentRequest;
}

export function useAddPurchasePayment(): ReturnType<
  typeof useMutation<Transaction, Error, AddPurchasePaymentVars>
> {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, AddPurchasePaymentVars>({
    mutationFn: ({ purchaseId, body }) =>
      purchasesApi.addPayment(purchaseId, body),
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        queryKeys.transactions.detail(updated.id),
        updated,
      );
      await invalidateAfterPurchase(queryClient);
    },
  });
}
