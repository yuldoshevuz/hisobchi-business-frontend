import { env } from '@/config/env';

type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type HapticNotificationType = 'error' | 'success' | 'warning';

// Minimal shape of `window.Telegram.WebApp` that we actually use. The official
// types live in `@twa-dev/types` (devDependency) but we read the global object
// directly to avoid the SDK package's import-time capture pitfall: when the
// package is evaluated before `telegram-web-app.js` finishes setting up the
// global, it freezes a `null`/mock and never re-checks. Lazy access fixes that.
interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: { user?: { id: number; username?: string } };
  version?: string;
  platform?: string;
  colorScheme?: string;
  themeParams?: Record<string, string>;
  ready: () => void;
  expand: () => void;
  close: () => void;
  disableVerticalSwipes?: () => void;
  HapticFeedback?: {
    impactOccurred: (style: HapticImpactStyle) => void;
    notificationOccurred: (type: HapticNotificationType) => void;
    selectionChanged: () => void;
  };
  MainButton?: {
    setText: (text: string) => void;
    setParams: (p: { color?: string; text_color?: string }) => void;
    enable: () => void;
    disable: () => void;
    show: () => void;
    hide: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
}

function getWebApp(): TelegramWebApp | null {
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram;
  return tg?.WebApp ?? null;
}

export function initTelegramWebApp(): void {
  const wa = getWebApp();
  if (!wa) return;
  try {
    wa.ready();
    wa.expand();
    wa.disableVerticalSwipes?.();
  } catch {
    // No-op on partial implementations.
  }
}

export function getTelegramInitData(): string | null {
  const fromTelegram = getWebApp()?.initData;
  if (fromTelegram && fromTelegram.length > 0) return fromTelegram;
  if (env.devInitData.length > 0) return env.devInitData;
  return null;
}

export function tgClose(): void {
  try {
    getWebApp()?.close();
  } catch {
    // No-op.
  }
}

export function tgHapticImpact(style: HapticImpactStyle = 'light'): void {
  try {
    getWebApp()?.HapticFeedback?.impactOccurred(style);
  } catch {
    // No-op.
  }
}

export function tgHapticNotify(type: HapticNotificationType): void {
  try {
    getWebApp()?.HapticFeedback?.notificationOccurred(type);
  } catch {
    // No-op.
  }
}

export function tgHapticSelection(): void {
  try {
    getWebApp()?.HapticFeedback?.selectionChanged();
  } catch {
    // No-op.
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
  const mb = getWebApp()?.MainButton;
  if (!mb) return () => {};

  try {
    mb.setText(opts.text);
    if (opts.color || opts.textColor) {
      mb.setParams({ color: opts.color, text_color: opts.textColor });
    }
    if (opts.enabled === false) mb.disable();
    else mb.enable();
    if (opts.showProgress) mb.showProgress(false);
    else mb.hideProgress();
    if (opts.visible === false) mb.hide();
    else mb.show();
    mb.onClick(opts.onClick);
  } catch {
    // No-op.
  }

  return (): void => {
    try {
      mb.offClick(opts.onClick);
      mb.hide();
      mb.hideProgress();
    } catch {
      // No-op.
    }
  };
}

export function setBackButton(handler: (() => void) | null): () => void {
  const bb = getWebApp()?.BackButton;
  if (!bb) return () => {};

  try {
    if (handler) {
      bb.onClick(handler);
      bb.show();
    } else {
      bb.hide();
    }
  } catch {
    // No-op.
  }

  return (): void => {
    try {
      if (handler) bb.offClick(handler);
      bb.hide();
    } catch {
      // No-op.
    }
  };
}

export function applyTelegramTheme(): void {
  try {
    const tp = getWebApp()?.themeParams;
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
    // No-op.
  }
}

export function isInsideTelegram(): boolean {
  const wa = getWebApp();
  if (!wa) return false;
  return Boolean(wa.initData) && wa.platform !== 'unknown';
}
