import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/api/organizations.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  CreateOrganizationRequest,
  CurrentOrganization,
  MyOrganization,
  Organization,
  UpdateOrganizationRequest,
} from '@/types/organization.types';

export function useMyOrganizations(): ReturnType<
  typeof useQuery<MyOrganization[], Error>
> {
  return useQuery<MyOrganization[], Error>({
    queryKey: queryKeys.organizations.list,
    queryFn: () => organizationsApi.list(),
    enabled: Boolean(tokenStore.getAccessToken()),
  });
}

export function useCurrentOrganization(): ReturnType<
  typeof useQuery<CurrentOrganization, Error>
> {
  return useQuery<CurrentOrganization, Error>({
    queryKey: queryKeys.organizations.current,
    queryFn: () => organizationsApi.getCurrent(),
    enabled: Boolean(tokenStore.getActiveOrgId()),
  });
}

export function useCreateOrganization(): ReturnType<
  typeof useMutation<Organization, Error, CreateOrganizationRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<Organization, Error, CreateOrganizationRequest>({
    mutationFn: (body) => organizationsApi.create(body),
    onSuccess: () => {
      void queryContact.invalidateQueries({
        queryKey: queryKeys.organizations.list,
      });
    },
  });
}

export function useUpdateCurrentOrganization(): ReturnType<
  typeof useMutation<Organization, Error, UpdateOrganizationRequest>
> {
  const queryContact = useQueryClient();
  return useMutation<Organization, Error, UpdateOrganizationRequest>({
    mutationFn: (body) => organizationsApi.updateCurrent(body),
    onSuccess: (data) => {
      queryContact.setQueryData<CurrentOrganization | undefined>(
        queryKeys.organizations.current,
        (prev) => (prev ? { ...prev, ...data, viewer: prev.viewer } : undefined),
      );
      void queryContact.invalidateQueries({
        queryKey: queryKeys.organizations.current,
      });
      void queryContact.invalidateQueries({
        queryKey: queryKeys.organizations.list,
      });
    },
  });
}
