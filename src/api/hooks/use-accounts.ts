import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '@/api/accounts.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  Account,
  CreateAccountRequest,
  ListAccountsQuery,
  UpdateAccountRequest,
} from '@/types/account.types';

export function useAccounts(
  query: ListAccountsQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<Account[], Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<Account[], Error>({
    queryKey: queryKeys.accounts.list(query),
    queryFn: () => accountsApi.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useAccount(
  id: number | null,
): ReturnType<typeof useQuery<Account, Error>> {
  return useQuery<Account, Error>({
    queryKey: queryKeys.accounts.detail(id ?? 0),
    queryFn: () => accountsApi.getById(id as number),
    enabled: Boolean(tokenStore.getActiveOrgId()) && id !== null,
  });
}

export function useCreateAccount(): ReturnType<
  typeof useMutation<Account, Error, CreateAccountRequest>
> {
  const queryClient = useQueryClient();
  return useMutation<Account, Error, CreateAccountRequest>({
    mutationFn: (body) => accountsApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}

interface UpdateAccountVars {
  id: number;
  body: UpdateAccountRequest;
}

export function useUpdateAccount(): ReturnType<
  typeof useMutation<Account, Error, UpdateAccountVars>
> {
  const queryClient = useQueryClient();
  return useMutation<Account, Error, UpdateAccountVars>({
    mutationFn: ({ id, body }) => accountsApi.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}

export function useArchiveAccount(): ReturnType<
  typeof useMutation<Account, Error, number>
> {
  const queryClient = useQueryClient();
  return useMutation<Account, Error, number>({
    mutationFn: (id) => accountsApi.archive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}

export function useDeleteAccount(): ReturnType<
  typeof useMutation<void, Error, number>
> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => accountsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}
