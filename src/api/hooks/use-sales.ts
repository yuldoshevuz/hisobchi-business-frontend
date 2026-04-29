import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@/api/sales.api';
import { queryKeys } from '@/api/query-keys';
import type {
  AddPaymentRequest,
  CreateSaleRequest,
  Transaction,
} from '@/types/transaction.types';

async function invalidateAfterSale(
  queryContact: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await Promise.all([
    queryContact.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.accounts.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.products.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.categories.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.clients.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.reports.all }),
  ]);
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
