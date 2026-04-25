import WebApp from '@twa-dev/sdk';
import { env } from '@/config/env';

type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type HapticNotificationType = 'error' | 'success' | 'warning';

export function initTelegramWebApp(): void {
  try {
    WebApp.ready();
    WebApp.expand();
    WebApp.disableVerticalSwipes?.();
  } catch {
    // Outside Telegram (e.g. browser dev) — SDK is a no-op.
  }
}

export function getTelegramInitData(): string | null {
  const fromTelegram = WebApp.initData;
  if (fromTelegram && fromTelegram.length > 0) return fromTelegram;
  if (env.devInitData.length > 0) return env.devInitData;
  return null;
}

export function tgClose(): void {
  try {
    WebApp.close();
  } catch {
    // Outside Telegram — no-op.
  }
}

export function tgHapticImpact(style: HapticImpactStyle = 'light'): void {
  try {
    WebApp.HapticFeedback.impactOccurred(style);
  } catch {
    // No-op outside Telegram.
  }
}

export function tgHapticNotify(type: HapticNotificationType): void {
  try {
    WebApp.HapticFeedback.notificationOccurred(type);
  } catch {
    // No-op outside Telegram.
  }
}

export function tgHapticSelection(): void {
  try {
    WebApp.HapticFeedback.selectionChanged();
  } catch {
    // No-op outside Telegram.
  }
}

export interface TelegramMainButtonOptions {
  text: string;
  onClick: () => void;
  visible?: boolean;
  enabled?: boolean;
  showProgress?: boolean;
  color?: string;
  textColor?: string;
}

export function setMainButton(opts: TelegramMainButtonOptions): () => void {
  const mb = WebApp.MainButton;
  if (!mb) return () => {};

  try {
    mb.setText(opts.text);
    if (opts.color || opts.textColor) {
      mb.setParams({
        color: opts.color,
        text_color: opts.textColor,
      });
    }
    if (opts.enabled === false) mb.disable();
    else mb.enable();
    if (opts.showProgress) mb.showProgress(false);
    else mb.hideProgress();
    if (opts.visible === false) mb.hide();
    else mb.show();
    mb.onClick(opts.onClick);
  } catch {
    // No-op outside Telegram.
  }

  return (): void => {
    try {
      mb.offClick(opts.onClick);
      mb.hide();
      mb.hideProgress();
    } catch {
      // No-op outside Telegram.
    }
  };
}

export function setBackButton(handler: (() => void) | null): () => void {
  const bb = WebApp.BackButton;
  if (!bb) return () => {};

  try {
    if (handler) {
      bb.onClick(handler);
      bb.show();
    } else {
      bb.hide();
    }
  } catch {
    // No-op outside Telegram.
  }

  return (): void => {
    try {
      if (handler) bb.offClick(handler);
      bb.hide();
    } catch {
      // No-op outside Telegram.
    }
  };
}

export function applyTelegramTheme(): void {
  try {
    const tp = WebApp.themeParams;
    if (!tp) return;
    const root = document.documentElement;
    if (tp.bg_color) root.style.setProperty('--tg-bg', tp.bg_color);
    if (tp.secondary_bg_color)
      root.style.setProperty('--tg-secondary-bg', tp.secondary_bg_color);
    if (tp.text_color) root.style.setProperty('--tg-text', tp.text_color);
    if (tp.hint_color) root.style.setProperty('--tg-hint', tp.hint_color);
    if (tp.button_color) root.style.setProperty('--tg-button', tp.button_color);
    if (tp.button_text_color)
      root.style.setProperty('--tg-button-text', tp.button_text_color);
  } catch {
    // No-op outside Telegram.
  }
}

export function isInsideTelegram(): boolean {
  try {
    return Boolean(WebApp.initData) && WebApp.platform !== 'unknown';
  } catch {
    return false;
  }
}
