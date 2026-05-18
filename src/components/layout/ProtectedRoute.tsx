import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { organizationsApi } from '@/api/organizations.api';
import { Spinner } from '@/components/ui/spinner';
import { useAccessToken, useActiveOrgId } from '@/hooks/use-token-store';
import { tokenStore } from '@/store/token-store';

interface ProtectedRouteProps {
  requireOrg?: boolean;
}

interface TelegramWebAppLite {
  initDataUnsafe?: { start_param?: string };
}

function readDeepLinkOrgId(): number | null {
  const tg = (
    window as unknown as { Telegram?: { WebApp?: TelegramWebAppLite } }
  ).Telegram;
  const startParam = tg?.WebApp?.initDataUnsafe?.start_param ?? null;
  const fromUrl = new URLSearchParams(window.location.search).get(
    'organizationId',
  );
  const fromTelegram = startParam
    ? new URLSearchParams(startParam).get('organizationId')
    : null;
  const raw = fromUrl ?? fromTelegram;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type SwitchState =
  | { phase: 'idle' }
  | { phase: 'resolving'; targetOrgId: number }
  | { phase: 'failed'; targetOrgId: number };

/**
 * The outer ProtectedRoute pulls the bot's `organizationId` deep-link
 * param BEFORE deciding whether to bounce the user to the org picker.
 * Without this pass, the inner `requireOrg` gate would redirect to
 * /organizations whenever `activeOrgId` is null — even though the bot
 * link knows exactly which tenant the user should land on — and the
 * `useDeepLink` hook (which lives inside AppShell, downstream of
 * `requireOrg`) would never run. So we resolve the switch here,
 * upstream of any org gating.
 */
export function ProtectedRoute({
  requireOrg = false,
}: ProtectedRouteProps): React.ReactElement {
  const accessToken = useAccessToken();
  const activeOrgId = useActiveOrgId();
  const location = useLocation();
  // Pre-seed the switch state from the URL on first render so the
  // `requireOrg && !activeOrgId` branch below doesn't redirect to
  // /organizations BEFORE the effect has a chance to swap activeOrgId.
  // useEffect fires post-commit, so without this lazy initialiser the
  // first render would already navigate away.
  const [switchState, setSwitchState] = useState<SwitchState>(() => {
    const target = readDeepLinkOrgId();
    if (target === null) return { phase: 'idle' };
    if (tokenStore.getActiveOrgId() === target) return { phase: 'idle' };
    return { phase: 'resolving', targetOrgId: target };
  });

  useEffect(() => {
    if (!accessToken) return;
    if (switchState.phase !== 'resolving') {
      // Either no deep-link or already aligned — make sure the param
      // is dropped from the URL so a refresh doesn't loop.
      stripOrgIdFromUrl();
      return;
    }
    const target = switchState.targetOrgId;
    let cancelled = false;
    void (async (): Promise<void> => {
      try {
        const memberships = await organizationsApi.list();
        if (cancelled) return;
        const isMember = memberships.some((m) => m.id === target);
        if (isMember) {
          tokenStore.setActiveOrgId(target);
          stripOrgIdFromUrl();
          setSwitchState({ phase: 'idle' });
        } else {
          setSwitchState({ phase: 'failed', targetOrgId: target });
        }
      } catch {
        if (!cancelled) setSwitchState({ phase: 'failed', targetOrgId: target });
      }
    })();
    return (): void => {
      cancelled = true;
    };
    // Trigger ONLY on token availability — every re-run after the
    // initial resolution would clobber state. The lazy initialiser
    // above captures the URL exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (switchState.phase === 'resolving') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (switchState.phase === 'failed') {
    return (
      <Navigate
        to="/organizations"
        replace
        state={{ membershipError: { organizationId: switchState.targetOrgId } }}
      />
    );
  }
  if (requireOrg && !activeOrgId) {
    return <Navigate to="/organizations" replace />;
  }
  return <Outlet />;
}

function stripOrgIdFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('organizationId')) return;
  url.searchParams.delete('organizationId');
  window.history.replaceState(
    null,
    '',
    `${url.pathname}${url.search ? url.search : ''}${url.hash}`,
  );
}
