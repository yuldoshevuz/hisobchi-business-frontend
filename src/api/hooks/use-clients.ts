import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/api/clients.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  Client,
  ClientBalance,
  CreateClientRequest,
  ListClientsQuery,
  PaginatedClients,
  UpdateClientRequest,
} from '@/types/client.types';

export function useClients(
  query: ListClientsQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PaginatedClients, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PaginatedClients, Error>({
    queryKey: queryKeys.clients.list(query),
    queryFn: () => clientsApi.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useClientBalance(
  id: number | null,
): ReturnType<typeof useQuery<ClientBalance, Error>> {
  return useQuery<ClientBalance, Error>({
    queryKey: queryKeys.clients.balance(id ?? 0),
    queryFn: () => clientsApi.getBalance(id as number),
    enabled: Boolean(tokenStore.getActiveOrgId()) && id !== null,
  });
}

export function useCreateClient(): ReturnType<
  typeof useMutation<Client, Error, CreateClientRequest>
> {
  const queryClient = useQueryClient();
  return useMutation<Client, Error, CreateClientRequest>({
    mutationFn: (body) => clientsApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

interface UpdateClientVars {
  id: number;
  body: UpdateClientRequest;
}

export function useUpdateClient(): ReturnType<
  typeof useMutation<Client, Error, UpdateClientVars>
> {
  const queryClient = useQueryClient();
  return useMutation<Client, Error, UpdateClientVars>({
    mutationFn: ({ id, body }) => clientsApi.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useArchiveClient(): ReturnType<
  typeof useMutation<Client, Error, number>
> {
  const queryClient = useQueryClient();
  return useMutation<Client, Error, number>({
    mutationFn: (id) => clientsApi.archive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useDeleteClient(): ReturnType<
  typeof useMutation<void, Error, number>
> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => clientsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}
