import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setUnauthorizedHandler } from '@/api/client';
import { useMe } from '@/api/hooks/use-user';
import { setLocale } from '@/i18n';
import { bootAuth } from '@/lib/boot-auth';
import { router } from '@/router';
import { tokenStore } from '@/store/token-store';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Mirrors `users.locale` from the backend into the i18next runtime so
 * every component that calls `useTranslation()` renders in the user's
 * chosen language. Lives inside the `QueryClientProvider` so it can use
 * `useMe()`; intentionally renders no UI of its own.
 */
function I18nSync(): null {
  const me = useMe();
  const locale = me.data?.locale;
  useEffect(() => {
    if (locale) setLocale(locale);
  }, [locale]);
  return null;
}

export function AppProviders({ children }: AppProvidersProps): React.ReactElement {
  const [queryContact] = useState<QueryClient>(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      queryContact.clear();
      tokenStore.clear();

      // Try to silently re-authenticate via Telegram WebApp initData. If we
      // are still inside the Mini App and initData is available, this will
      // mint a fresh JWT and the user never sees /login. Only if that fails
      // do we route to /login as a last resort.
      await bootAuth();

      if (tokenStore.getSnapshot().accessToken) {
        // Re-authenticated — invalidate to refetch with the new token.
        await queryContact.invalidateQueries();
        return;
      }

      if (window.location.pathname !== '/login') {
        // Contact-side navigation. A hard `window.location.assign` would
        // wipe Telegram Mini App's initData (it is only provided on the
        // initial page load) and break the login flow on the next render.
        void router.navigate('/login', { replace: true });
      }
    });
  }, [queryContact]);

  return (
    <QueryClientProvider client={queryContact}>
      <I18nSync />
      {children}
    </QueryClientProvider>
  );
}
