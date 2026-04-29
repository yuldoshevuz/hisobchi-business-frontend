import { useMutation, useQueryClient } from '@tanstack/react-query';
import { incomesApi } from '@/api/incomes.api';
import { queryKeys } from '@/api/query-keys';
import type {
  AddPaymentRequest,
  CreateIncomeRequest,
  Transaction,
} from '@/types/transaction.types';

async function invalidateAfterIncome(
  queryContact: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await Promise.all([
    queryContact.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.accounts.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.categories.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.clients.all }),
    queryContact.invalidateQueries({ queryKey: queryKeys.reports.all }),
  ]);
}

export function useCreateIncome(): ReturnType<
  typeof useMutation<Transaction, Error, CreateIncomeRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<Transaction, Error, CreateIncomeRequest>({
    mutationFn: (body) => incomesApi.create(body),
    onSuccess: async (created) => {
      queryContact.setQueryData(
        queryKeys.transactions.detail(created.id),
        created,
      );
      await invalidateAfterIncome(queryContact);
    },
  });
}

interface AddIncomePaymentVars {
  incomeId: number;
  body: AddPaymentRequest;
}

export function useAddIncomePayment(): ReturnType<
  typeof useMutation<Transaction, Error, AddIncomePaymentVars>
> {
  const queryContact = useQueryClient();
  return useMutation<Transaction, Error, AddIncomePaymentVars>({
    mutationFn: ({ incomeId, body }) =>
      incomesApi.addPayment(incomeId, body),
    onSuccess: async (updated) => {
      queryContact.setQueryData(
        queryKeys.transactions.detail(updated.id),
        updated,
      );
      await invalidateAfterIncome(queryContact);
    },
  });
}
