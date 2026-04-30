import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '@/api/members.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  AssignRolesRequest,
  InviteMemberRequest,
  ListMembersQuery,
  Member,
  PaginatedResponse,
  UpdateEmployeeDefaultsRequest,
  UpdateMemberStatusRequest,
} from '@/types/member.types';

export function useMembers(
  query: ListMembersQuery = {},
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PaginatedResponse<Member>, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PaginatedResponse<Member>, Error>({
    queryKey: queryKeys.members.list(query),
    queryFn: () => membersApi.list(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useInviteMember(): ReturnType<
  typeof useMutation<Member, Error, InviteMemberRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<Member, Error, InviteMemberRequest>({
    mutationFn: (body) => membersApi.invite(body),
    onSuccess: () => {
      void queryContact.invalidateQueries({
        queryKey: queryKeys.members.all,
      });
    },
  });
}

interface UpdateStatusVars {
  id: number;
  body: UpdateMemberStatusRequest;
}

export function useUpdateMemberStatus(): ReturnType<
  typeof useMutation<Member, Error, UpdateStatusVars>
> {
  const queryContact = useQueryClient();
  return useMutation<Member, Error, UpdateStatusVars>({
    mutationFn: ({ id, body }) => membersApi.updateStatus(id, body),
    onSuccess: () => {
      void queryContact.invalidateQueries({
        queryKey: queryKeys.members.all,
      });
    },
  });
}

interface AssignRolesVars {
  id: number;
  body: AssignRolesRequest;
}

export function useAssignMemberRoles(): ReturnType<
  typeof useMutation<Member, Error, AssignRolesVars>
> {
  const queryContact = useQueryClient();
  return useMutation<Member, Error, AssignRolesVars>({
    mutationFn: ({ id, body }) => membersApi.assignRoles(id, body),
    onSuccess: () => {
      void queryContact.invalidateQueries({
        queryKey: queryKeys.members.all,
      });
    },
  });
}

interface UpdateEmployeeDefaultsVars {
  id: number;
  body: UpdateEmployeeDefaultsRequest;
}

export function useUpdateEmployeeDefaults(): ReturnType<
  typeof useMutation<Member, Error, UpdateEmployeeDefaultsVars>
> {
  const qc = useQueryClient();
  return useMutation<Member, Error, UpdateEmployeeDefaultsVars>({
    mutationFn: ({ id, body }) => membersApi.updateEmployeeDefaults(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.members.all });
    },
  });
}

export function useRemoveMember(): ReturnType<
  typeof useMutation<void, Error, number>
> {
  const queryContact = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => membersApi.remove(id),
    onSuccess: () => {
      void queryContact.invalidateQueries({
        queryKey: queryKeys.members.all,
      });
    },
  });
}
