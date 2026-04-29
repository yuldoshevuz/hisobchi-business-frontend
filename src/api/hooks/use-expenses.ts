import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '@/api/expenses.api';
import { queryKeys } from '@/api/query-keys';
import type {
  AddPaymentRequest,
  CreateExpenseRequest,
  Transaction,
} from '@/types/transaction.types';

async function invalidateAfterExpense(
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

export function useCreateExpense(): ReturnType<
  typeof useMutation<Transaction, Error, CreateExpenseRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<Transaction, Error, CreateExpenseRequest>({
    mutationFn: (body) => expensesApi.create(body),
    onSuccess: async (created) => {
      queryContact.setQueryData(
        queryKeys.transactions.detail(created.id),
        created,
      );
      await invalidateAfterExpense(queryContact);
    },
  });
}

interface AddExpensePaymentVars {
  expenseId: number;
  body: AddPaymentRequest;
}

export function useAddExpensePayment(): ReturnType<
  typeof useMutation<Transaction, Error, AddExpensePaymentVars>
> {
  const queryContact = useQueryClient();
  return useMutation<Transaction, Error, AddExpensePaymentVars>({
    mutationFn: ({ expenseId, body }) =>
      expensesApi.addPayment(expenseId, body),
    onSuccess: async (updated) => {
      queryContact.setQueryData(
        queryKeys.transactions.detail(updated.id),
        updated,
      );
      await invalidateAfterExpense(queryContact);
    },
  });
}
