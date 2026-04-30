import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commissionsApi } from '@/api/commissions.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  Commission,
  CommissionsSummaryRow,
  CreateCommissionRequest,
  ListCommissionsQuery,
  PaginatedCommissions,
  VoidCommissionRequest,
} from '@/types/commission.types';

export function useCommissions(
  query: ListCommissionsQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PaginatedCommissions, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PaginatedCommissions, Error>({
    queryKey: queryKeys.commissions.list(query),
    queryFn: () => commissionsApi.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useCommissionsSummary(
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<CommissionsSummaryRow[], Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<CommissionsSummaryRow[], Error>({
    queryKey: queryKeys.commissions.summary,
    queryFn: () => commissionsApi.summary(),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useCommissionById(
  id: number | null,
): ReturnType<typeof useQuery<Commission, Error>> {
  return useQuery<Commission, Error>({
    queryKey: queryKeys.commissions.detail(id ?? 0),
    queryFn: () => commissionsApi.getById(id as number),
    enabled: Boolean(tokenStore.getActiveOrgId()) && id !== null,
  });
}

export function useCreateCommission(): ReturnType<
  typeof useMutation<Commission, Error, CreateCommissionRequest>
> {
  const qc = useQueryClient();
  return useMutation<Commission, Error, CreateCommissionRequest>({
    mutationFn: (body) => commissionsApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.commissions.all });
    },
  });
}

interface VoidCommissionVars {
  id: number;
  body?: VoidCommissionRequest;
}

export function useVoidCommission(): ReturnType<
  typeof useMutation<Commission, Error, VoidCommissionVars>
> {
  const qc = useQueryClient();
  return useMutation<Commission, Error, VoidCommissionVars>({
    mutationFn: ({ id, body }) => commissionsApi.void(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.commissions.all });
    },
  });
}
