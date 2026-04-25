import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/api/rbac.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  CreateRoleRequest,
  PermissionsListResponse,
  Role,
  UpdateRoleRequest,
} from '@/types/rbac.types';

export function usePermissions(
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PermissionsListResponse, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PermissionsListResponse, Error>({
    queryKey: queryKeys.rbac.permissions,
    queryFn: () => rbacApi.listPermissions(),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
    staleTime: 5 * 60_000,
  });
}

export function useRoles(
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<Role[], Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<Role[], Error>({
    queryKey: queryKeys.rbac.roles,
    queryFn: () => rbacApi.listRoles(),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useCreateRole(): ReturnType<
  typeof useMutation<Role, Error, CreateRoleRequest>
> {
  const queryClient = useQueryClient();
  return useMutation<Role, Error, CreateRoleRequest>({
    mutationFn: (body) => rbacApi.createRole(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rbac.roles });
    },
  });
}

interface UpdateRoleVars {
  id: number;
  body: UpdateRoleRequest;
}

export function useUpdateRole(): ReturnType<
  typeof useMutation<Role, Error, UpdateRoleVars>
> {
  const queryClient = useQueryClient();
  return useMutation<Role, Error, UpdateRoleVars>({
    mutationFn: ({ id, body }) => rbacApi.updateRole(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rbac.roles });
    },
  });
}

export function useDeleteRole(): ReturnType<
  typeof useMutation<void, Error, number>
> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => rbacApi.deleteRole(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rbac.roles });
    },
  });
}
