import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import { queryKeys } from '@/api/query-keys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tokenStore } from '@/store/token-store';

/**
 * DEV-ONLY login page — pastes a Telegram id and trades it for tokens
 * via `POST /web/auth/dev/impersonate`. Lets a developer reproduce any
 * user's account in the browser without needing their device or
 * initData. Hidden in production builds (the route is registered only
 * when `import.meta.env.DEV` is true) AND the backend itself rejects the
 * call unless `NODE_ENV=development` or `ENABLE_DEV_IMPERSONATION=true`,
 * so even if a build leaks the route the endpoint is the real gate.
 */
export function DevImpersonatePage(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [telegramIdInput, setTelegramIdInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const numericId = Number(telegramIdInput.trim());
  const isValid = Number.isFinite(numericId) && numericId > 0;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authApi.devImpersonate({ telegramId: numericId });
      tokenStore.setTokens(res.accessToken, res.refreshToken);
      queryClient.setQueryData(queryKeys.user.me, res.user);
      queryClient.setQueryData(queryKeys.organizations.list, res.organizations);
      // Reset every active query so the org context refetches with the
      // new user's tokens — otherwise stale dashboard / lists would
      // briefly render under the impersonated identity.
      await queryClient.invalidateQueries();
      navigate('/');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-10">
      <div>
        <h1 className="text-[20px] font-semibold">🛠 Dev Impersonate</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Faqat development uchun. Telegram ID kiriting va o'sha
          foydalanuvchi sifatida kiring.
        </p>
        <p className="mt-1 text-[12px] text-amber-600">
          ⚠️ Production'da bu endpoint rad etiladi.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="dev-telegram-id">Telegram ID</Label>
          <Input
            id="dev-telegram-id"
            type="text"
            inputMode="numeric"
            placeholder="123456789"
            value={telegramIdInput}
            onChange={(e) => {
              // Strip non-digits so paste-with-newlines works cleanly.
              setTelegramIdInput(e.target.value.replace(/\D/g, ''));
              setError(null);
            }}
            autoFocus
          />
        </div>

        {error ? (
          <p className="text-[13px] text-destructive">{error}</p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!isValid || submitting}
        >
          {submitting ? <Spinner /> : null}
          Kirish
        </Button>
      </form>
    </div>
  );
}
