import { useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from '@/api/purchases.api';
import { queryKeys } from '@/api/query-keys';
import type {
  AddPaymentRequest,
  CreatePurchaseRequest,
  Transaction,
} from '@/types/transaction.types';

async function invalidateAfterPurchase(
  queryContact: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await Promise.all([
    queryContact.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.accounts.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.products.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.categories.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.reports.all }),
  ]);
}

export function useCreatePurchase(): ReturnType<
  typeof useMutation<Transaction, Error, CreatePurchaseRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<Transaction, Error, CreatePurchaseRequest>({
    mutationFn: (body) => purchasesApi.create(body),
    onSuccess: async (created) => {
      queryContact.setQueryData(
        queryKeys.transactions.detail(created.id),
        created,
      );
      await invalidateAfterPurchase(queryContact);
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
  const queryContact = useQueryClient();
  return useMutation<Transaction, Error, AddPurchasePaymentVars>({
    mutationFn: ({ purchaseId, body }) =>
      purchasesApi.addPayment(purchaseId, body),
    onSuccess: async (updated) => {
      queryContact.setQueryData(
        queryKeys.transactions.detail(updated.id),
        updated,
      );
      await invalidateAfterPurchase(queryContact);
    },
  });
}
