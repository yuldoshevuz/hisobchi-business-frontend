import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/config/env';
import i18n from '@/i18n';
import { tokenStore } from '@/store/token-store';
import type { TokensResponse } from '@/types/auth.types';

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuth?: boolean;
}

export const api: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const cfg = config as RetriableConfig;
  const headers =
    config.headers instanceof AxiosHeaders
      ? config.headers
      : new AxiosHeaders(config.headers);
  headers.set('Accept-Language', i18n.language);
  config.headers = headers;
  if (cfg._skipAuth) return config;
  const token = tokenStore.getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let refreshInflight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post<TokensResponse>(
      `${env.apiBaseUrl}/web/auth/refresh`,
      { refreshToken },
      { timeout: 15_000 },
    );
    tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);

    // If the user had an active org, re-issue an org-scoped token so
    // subsequent requests to OrganizationScopedGuard endpoints don't get 403.
    const activeOrgId = tokenStore.getActiveOrgId();
    if (activeOrgId !== null) {
      try {
        const orgRes = await axios.post<{ accessToken: string }>(
          `${env.apiBaseUrl}/web/auth/organizations/select`,
          { organizationId: activeOrgId },
          {
            timeout: 15_000,
            headers: { Authorization: `Bearer ${res.data.accessToken}` },
          },
        );
        tokenStore.setAccessToken(orgRes.data.accessToken);
        return orgRes.data.accessToken;
      } catch {
        // Org no longer accessible — fall back to user-scoped token.
        // The org-gated UI will redirect to /organizations automatically.
        tokenStore.setActiveOrgId(null);
      }
    }

    return res.data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      refreshInflight ??= performRefresh().finally(() => {
        refreshInflight = null;
      });
      const newToken = await refreshInflight;
      if (newToken) {
        const headers =
          original.headers instanceof AxiosHeaders
            ? original.headers
            : new AxiosHeaders(original.headers);
        headers.set('Authorization', `Bearer ${newToken}`);
        original.headers = headers;
        return api.request(original);
      }
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export async function postPublic<TRes, TBody = unknown>(
  url: string,
  body: TBody,
): Promise<TRes> {
  const cfg: AxiosRequestConfig = { _skipAuth: true } as AxiosRequestConfig;
  const { data } = await api.post<TRes>(url, body, cfg);
  return data;
}
