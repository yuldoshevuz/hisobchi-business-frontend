import { authApi } from '@/api/auth.api';
import { env } from '@/config/env';
import { tokenStore } from '@/store/token-store';

/**
 * Pre-mount Telegram auth: if we are running inside the Telegram Mini App AND
 * the user is not yet logged in (no access token in store), trade the
 * `WebApp.initData` blob for a JWT pair via the backend before React renders
 * any route.
 *
 * This avoids a race where:
 *   1. React mounts
 *   2. ProtectedRoute sees no token, navigates to `/login`
 *   3. LoginPage tries to read `WebApp.initData` — but in some Telegram
 *      clients (notably macOS desktop) the navigation has already invalidated
 *      it, so initData reads as empty and the user is stuck.
 *
 * By doing the trade BEFORE the first render, the access token is already in
 * the store when ProtectedRoute decides whether to allow the page through.
 */
export async function bootAuth(): Promise<void> {
  // Already authenticated — nothing to do.
  if (tokenStore.getSnapshot().accessToken) return;

  const initData = readInitData();
  if (!initData) return;

  try {
    const res = await authApi.telegramWebAppLogin({ initData });
    tokenStore.setTokens(res.accessToken, res.refreshToken);
  } catch (err) {
    // Auth failed (invalid initData / network / backend down). We let React
    // mount and the LoginPage show the appropriate error to the user instead
    // of crashing the boot. The error is logged so it surfaces in the console.
    console.error('[bootAuth] telegram-webapp login failed', err);
  }
}

function readInitData(): string | null {
  const tg = (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram;
  const fromTelegram = tg?.WebApp?.initData;
  if (fromTelegram && fromTelegram.length > 0) return fromTelegram;
  if (env.devInitData.length > 0) return env.devInitData;
  return null;
}
