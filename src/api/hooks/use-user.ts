import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api/user.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  SetPrimaryOrganizationRequest,
  UpdateProfileRequest,
  User,
} from '@/types/user.types';

export function useMe(): ReturnType<typeof useQuery<User, Error>> {
  return useQuery<User, Error>({
    queryKey: queryKeys.user.me,
    queryFn: () => userApi.getMe(),
    enabled: Boolean(tokenStore.getAccessToken()),
  });
}

export function useUpdateMe(): ReturnType<
  typeof useMutation<User, Error, UpdateProfileRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<User, Error, UpdateProfileRequest>({
    mutationFn: (body) => userApi.updateMe(body),
    onSuccess: (data) => {
      queryContact.setQueryData(queryKeys.user.me, data);
    },
  });
}

export function usePrimaryOrganizationId(): number | null {
  const me = useMe();
  return me.data?.primaryOrganizationId ?? null;
}

export function useSetPrimaryOrganization(): ReturnType<
  typeof useMutation<User, Error, SetPrimaryOrganizationRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<User, Error, SetPrimaryOrganizationRequest>({
    mutationFn: (body) => userApi.setPrimaryOrganization(body),
    onSuccess: (data) => {
      queryContact.setQueryData(queryKeys.user.me, data);
    },
  });
}
