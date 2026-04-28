import { useMutation, useQueryClient } from '@tanstack/react-query';
import { debtsApi } from '@/api/debts.api';
import { queryKeys } from '@/api/query-keys';
import type {
  AddPaymentRequest,
  CreateDebtRequest,
  Transaction,
} from '@/types/transaction.types';

async function invalidateAfterDebt(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.clients.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
  ]);
}

export function useCreateDebt(): ReturnType<
  typeof useMutation<Transaction, Error, CreateDebtRequest>
> {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, CreateDebtRequest>({
    mutationFn: (body) => debtsApi.create(body),
    onSuccess: async (created) => {
      queryClient.setQueryData(
        queryKeys.transactions.detail(created.id),
        created,
      );
      await invalidateAfterDebt(queryClient);
    },
  });
}

interface AddDebtRepaymentVars {
  debtId: number;
  body: AddPaymentRequest;
}

export function useAddDebtRepayment(): ReturnType<
  typeof useMutation<Transaction, Error, AddDebtRepaymentVars>
> {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, AddDebtRepaymentVars>({
    mutationFn: ({ debtId, body }) => debtsApi.addRepayment(debtId, body),
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        queryKeys.transactions.detail(updated.id),
        updated,
      );
      await invalidateAfterDebt(queryClient);
    },
  });
}
