import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adjustmentsApi } from '@/api/adjustments.api';
import { queryKeys } from '@/api/query-keys';
import type {
  CreateAdjustmentRequest,
  Transaction,
} from '@/types/transaction.types';

export function useCreateAdjustment(): ReturnType<
  typeof useMutation<Transaction, Error, CreateAdjustmentRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<Transaction, Error, CreateAdjustmentRequest>({
    mutationFn: (body) => adjustmentsApi.create(body),
    onSuccess: async (created) => {
      queryContact.setQueryData(
        queryKeys.transactions.detail(created.id),
        created,
      );
      await Promise.all([
        queryContact.invalidateQueries({ queryKey: queryKeys.transactions.all }),
        queryContact.invalidateQueries({ queryKey: queryKeys.accounts.all }),
        queryContact.invalidateQueries({ queryKey: queryKeys.reports.all }),
      ]);
    },
  });
}
