import { api, postPublic } from './client';
import type {
  AuthResponse,
  LogoutRequest,
  RefreshRequest,
  SelectOrganizationRequest,
  SelectOrganizationResponse,
  TelegramWebAppLoginRequest,
  TokensResponse,
} from '@/types/auth.types';

const BASE = '/web/auth';

export const authApi = {
  telegramWebAppLogin(body: TelegramWebAppLoginRequest): Promise<AuthResponse> {
    return postPublic<AuthResponse, TelegramWebAppLoginRequest>(
      `${BASE}/telegram-webapp/login`,
      body,
    );
  },
  refresh(body: RefreshRequest): Promise<TokensResponse> {
    return postPublic<TokensResponse, RefreshRequest>(
      `${BASE}/refresh`,
      body,
    );
  },
  async selectOrganization(
    body: SelectOrganizationRequest,
  ): Promise<SelectOrganizationResponse> {
    const { data } = await api.post<SelectOrganizationResponse>(
      `${BASE}/organizations/select`,
      body,
    );
    return data;
  },
  async logout(body: LogoutRequest): Promise<void> {
    await api.post(`${BASE}/logout`, body);
  },
};
