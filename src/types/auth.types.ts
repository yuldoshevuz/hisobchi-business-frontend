import type { User } from './user.types';

export interface AuthOrganizationSummary {
  id: number;
  name: string;
  memberId: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  organizations: AuthOrganizationSummary[];
  hint?: 'password_not_set';
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface TelegramWebAppLoginRequest {
  initData: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface SelectOrganizationRequest {
  organizationId: number;
}

export interface SelectOrganizationResponse {
  accessToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}
