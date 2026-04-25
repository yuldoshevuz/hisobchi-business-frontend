import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import { tokenStore } from '@/store/token-store';
import { queryKeys } from '@/api/query-keys';
import type {
  AuthResponse,
  SelectOrganizationRequest,
  SelectOrganizationResponse,
  TelegramWebAppLoginRequest,
} from '@/types/auth.types';

export function useTelegramWebAppLogin(): ReturnType<
  typeof useMutation<AuthResponse, Error, TelegramWebAppLoginRequest>
> {
  const queryClient = useQueryClient();
  return useMutation<AuthResponse, Error, TelegramWebAppLoginRequest>({
    mutationFn: (body) => authApi.telegramWebAppLogin(body),
    onSuccess: (data) => {
      tokenStore.setTokens(data.accessToken, data.refreshToken);
      queryClient.setQueryData(queryKeys.user.me, data.user);
      queryClient.setQueryData(queryKeys.organizations.list, data.organizations);
    },
  });
}

export function useSelectOrganization(): ReturnType<
  typeof useMutation<
    SelectOrganizationResponse,
    Error,
    SelectOrganizationRequest
  >
> {
  const queryClient = useQueryClient();
  return useMutation<
    SelectOrganizationResponse,
    Error,
    SelectOrganizationRequest
  >({
    mutationFn: (body) => authApi.selectOrganization(body),
    onSuccess: (data, variables) => {
      tokenStore.setAccessToken(data.accessToken);
      tokenStore.setActiveOrgId(variables.organizationId);
      queryClient.invalidateQueries();
    },
  });
}

export function useLogout(): ReturnType<typeof useMutation<void, Error, void>> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const refreshToken = tokenStore.getRefreshToken() ?? undefined;
      try {
        await authApi.logout({ refreshToken });
      } catch {
        // Ignore network errors on logout — local cleanup still runs.
      }
    },
    onSettled: () => {
      tokenStore.clear();
      queryClient.clear();
    },
  });
}
