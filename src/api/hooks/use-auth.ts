import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import { tgClose } from '@/lib/telegram';
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
  const queryContact = useQueryClient();
  return useMutation<AuthResponse, Error, TelegramWebAppLoginRequest>({
    mutationFn: (body) => authApi.telegramWebAppLogin(body),
    onSuccess: (data) => {
      tokenStore.setTokens(data.accessToken, data.refreshToken);
      queryContact.setQueryData(queryKeys.user.me, data.user);
      queryContact.setQueryData(queryKeys.organizations.list, data.organizations);
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
  const queryContact = useQueryClient();
  return useMutation<
    SelectOrganizationResponse,
    Error,
    SelectOrganizationRequest
  >({
    mutationFn: (body) => authApi.selectOrganization(body),
    onSuccess: (data, variables) => {
      tokenStore.setAccessToken(data.accessToken);
      tokenStore.setActiveOrgId(variables.organizationId);
      queryContact.invalidateQueries();
    },
  });
}

export function useLogout(): ReturnType<typeof useMutation<void, Error, void>> {
  const queryContact = useQueryClient();
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
      queryContact.clear();
      // Close the Mini App so Telegram releases the cached WebView and
      // provides a fresh `initData` on the NEXT launch. Otherwise the user
      // would land on /login here with empty initData (one-shot per launch
      // on most clients) and be unable to re-authenticate without manually
      // killing the Telegram chat.
      tgClose();
    },
  });
}
