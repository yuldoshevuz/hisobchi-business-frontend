import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramWebAppLogin } from '@/api/hooks/use-auth';
import { getTelegramInitData, tgHapticNotify } from '@/lib/telegram';
import { useTelegramMainButton } from '@/hooks/use-tg-main-button';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const login = useTelegramWebAppLogin();
  const initData = useMemo(() => getTelegramInitData(), []);

  const submit = useCallback((): void => {
    if (!initData) return;
    login.mutate(
      { initData },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          navigate('/organizations', { replace: true });
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [initData, login, navigate]);

  useEffect(() => {
    if (login.status === 'idle' && initData) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground text-3xl font-bold">
        H
      </div>
      <h1 className="text-[24px] font-bold leading-tight">Hisobchi Business</h1>
      <p className="mt-2 max-w-xs text-[14px] text-muted-foreground">
        Tashkilot moliyasini Telegram orqali boshqaring
      </p>

      <div className="mt-8 w-full max-w-sm space-y-3">
        {!initData ? (
          <>
            <p className="text-[13px] text-muted-foreground">
              Iltimos, ushbu ilovani Telegram bot orqali oching.
            </p>
            <pre className="mt-3 max-h-72 overflow-auto rounded bg-muted p-2 text-left text-[10px] leading-tight">
              {(() => {
                const tg = (window as { Telegram?: { WebApp?: Record<string, unknown> } })
                  .Telegram?.WebApp;
                return JSON.stringify(
                  {
                    hasWindowTelegram:
                      typeof (window as { Telegram?: unknown }).Telegram !== 'undefined',
                    hasWebApp: tg !== undefined,
                    platform: (tg?.platform as string | undefined) ?? '<undef>',
                    version: (tg?.version as string | undefined) ?? '<undef>',
                    initDataLen: ((tg?.initData as string | undefined) ?? '').length,
                    initDataPreview: ((tg?.initData as string | undefined) ?? '').slice(0, 80),
                    user:
                      (tg?.initDataUnsafe as { user?: unknown } | undefined)?.user ?? null,
                    href: window.location.href,
                    hashLen: window.location.hash.length,
                    searchLen: window.location.search.length,
                    userAgent: navigator.userAgent.slice(0, 80),
                  },
                  null,
                  2,
                );
              })()}
            </pre>
          </>
        ) : login.isPending ? (
          <div className="flex items-center justify-center gap-2 text-[14px] text-muted-foreground">
            <Spinner /> Telegram orqali kirilmoqda…
          </div>
        ) : login.isError ? (
          <>
            <p className="text-[14px] text-destructive">
              {getApiErrorMessage(login.error)}
            </p>
            <Button size="lg" className="w-full" onClick={submit}>
              Qayta urinish
            </Button>
          </>
        ) : (
          <Button size="lg" className="w-full" onClick={submit}>
            Telegram orqali kirish
          </Button>
        )}
      </div>
    </div>
  );
}
