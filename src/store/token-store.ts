const ACCESS_TOKEN_KEY = 'hb.accessToken';
const REFRESH_TOKEN_KEY = 'hb.refreshToken';
const ACTIVE_ORG_ID_KEY = 'hb.activeOrgId';

type Listener = () => void;

interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  activeOrgId: number | null;
}

const listeners = new Set<Listener>();

const state: TokenState = {
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  activeOrgId: ((): number | null => {
    const raw = localStorage.getItem(ACTIVE_ORG_ID_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  })(),
};

function emit(): void {
  listeners.forEach((l) => l());
}

export const tokenStore = {
  getAccessToken(): string | null {
    return state.accessToken;
  },
  getRefreshToken(): string | null {
    return state.refreshToken;
  },
  getActiveOrgId(): number | null {
    return state.activeOrgId;
  },
  setTokens(accessToken: string, refreshToken: string): void {
    state.accessToken = accessToken;
    state.refreshToken = refreshToken;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    emit();
  },
  setAccessToken(accessToken: string): void {
    state.accessToken = accessToken;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    emit();
  },
  setActiveOrgId(orgId: number | null): void {
    state.activeOrgId = orgId;
    if (orgId === null) {
      localStorage.removeItem(ACTIVE_ORG_ID_KEY);
    } else {
      localStorage.setItem(ACTIVE_ORG_ID_KEY, String(orgId));
    }
    emit();
  },
  clear(): void {
    state.accessToken = null;
    state.refreshToken = null;
    state.activeOrgId = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACTIVE_ORG_ID_KEY);
    emit();
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return (): void => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): TokenState {
    return state;
  },
};
