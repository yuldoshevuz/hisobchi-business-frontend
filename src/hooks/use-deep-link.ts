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
 *   - `screen=newTransfer[&proposalRawMessageId=<id>]`
 *     → `/transactions/new/transfer` — used by the AI bot when the user
 *       wrote a transfer message ("1 mln o'tkazdim") without naming the
 *       source / destination accounts; the form is opened blank so the
 *       user picks accounts there. `proposalRawMessageId` is forwarded
 *       so the page can fetch the raw_message and pre-fill amount /
 *       description if it wants to.
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
    const proposalRawMessageId =
      fromUrl.get('proposalRawMessageId') ??
      fromTelegram.get('proposalRawMessageId');

    consumedRef.current = true;

    // Strip the params from the URL so a refresh does not re-trigger.
    fromUrl.delete('screen');
    fromUrl.delete('transactionId');
    fromUrl.delete('reminderId');
    fromUrl.delete('amount');
    fromUrl.delete('proposalRawMessageId');
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
      case 'newTransfer': {
        const params = new URLSearchParams();
        if (proposalRawMessageId) {
          params.set('proposalRawMessageId', proposalRawMessageId);
        }
        const qs = params.toString();
        navigate(`/transactions/new/transfer${qs ? `?${qs}` : ''}`);
        break;
      }
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
