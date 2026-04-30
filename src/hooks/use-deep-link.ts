import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface TelegramWebAppLite {
  initDataUnsafe?: { start_param?: string };
}

function readStartParam(): string | null {
  const tg = (
    window as unknown as { Telegram?: { WebApp?: TelegramWebAppLite } }
  ).Telegram;
  return tg?.WebApp?.initDataUnsafe?.start_param ?? null;
}

/**
 * Parses Telegram-bot deep link parameters and navigates the user to the
 * matching internal route exactly once per app session.
 *
 * Supported params (read from `window.location.search` first, then Telegram's
 * `start_param` URL-decoded as a query string):
 *   - `screen=transaction&transactionId=<id>`
 *     → `/transactions/<id>`
 *   - `screen=overpayment&transactionId=<id>&amount=<amount>`
 *     → `/transactions/<id>?action=add-cash-flow&suggestedAmount=<amount>`
 *   - `screen=void&transactionId=<id>`
 *     → `/transactions/<id>?action=void`
 *   - `screen=reminder&reminderId=<id>`
 *     → `/?reminderId=<id>` — opens the reminder detail modal on the
 *       dashboard once the carousel data lands.
 */
export function useDeepLink(): void {
  const navigate = useNavigate();
  const consumedRef = useRef<boolean>(false);

  useEffect(() => {
    if (consumedRef.current) return;

    const fromUrl = new URLSearchParams(window.location.search);
    const startParam = readStartParam();
    const fromTelegram = startParam
      ? new URLSearchParams(startParam)
      : new URLSearchParams();

    const screen = fromUrl.get('screen') ?? fromTelegram.get('screen');
    if (!screen) return;

    const transactionId =
      fromUrl.get('transactionId') ?? fromTelegram.get('transactionId');
    const reminderId =
      fromUrl.get('reminderId') ?? fromTelegram.get('reminderId');
    const amount = fromUrl.get('amount') ?? fromTelegram.get('amount');

    consumedRef.current = true;

    // Strip the params from the URL so a refresh does not re-trigger.
    fromUrl.delete('screen');
    fromUrl.delete('transactionId');
    fromUrl.delete('reminderId');
    fromUrl.delete('amount');
    const cleaned = fromUrl.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${cleaned ? `?${cleaned}` : ''}`,
    );

    switch (screen) {
      case 'transaction':
        if (transactionId) navigate(`/transactions/${transactionId}`);
        break;
      case 'overpayment':
        if (transactionId) {
          const params = new URLSearchParams({ action: 'add-cash-flow' });
          if (amount) params.set('suggestedAmount', amount);
          navigate(`/transactions/${transactionId}?${params.toString()}`);
        }
        break;
      case 'void':
        if (transactionId) {
          navigate(`/transactions/${transactionId}?action=void`);
        }
        break;
      case 'reminder':
        if (reminderId) {
          // The dashboard reads `?reminderId=...` on mount and forwards it
          // into ReminderHighlights — keeps deep-link plumbing in one place
          // (this hook) and rendering concerns in the page.
          navigate(`/?reminderId=${encodeURIComponent(reminderId)}`);
        }
        break;
    }
  }, [navigate]);
}
