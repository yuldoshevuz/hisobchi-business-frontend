import { useSyncExternalStore } from 'react';
import { tokenStore } from '@/store/token-store';

export function useAccessToken(): string | null {
  return useSyncExternalStore(
    tokenStore.subscribe,
    () => tokenStore.getSnapshot().accessToken,
  );
}

export function useActiveOrgId(): number | null {
  return useSyncExternalStore(
    tokenStore.subscribe,
    () => tokenStore.getSnapshot().activeOrgId,
  );
}
