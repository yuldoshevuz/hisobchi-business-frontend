import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transfersApi } from '@/api/transfers.api';
import { queryKeys } from '@/api/query-keys';
import type {
  CreateTransferRequest,
  Transaction,
} from '@/types/transaction.types';

export function useCreateTransfer(): ReturnType<
  typeof useMutation<Transaction, Error, CreateTransferRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<Transaction, Error, CreateTransferRequest>({
    mutationFn: (body) => transfersApi.create(body),
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
