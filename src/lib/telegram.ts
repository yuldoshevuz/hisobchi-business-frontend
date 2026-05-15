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
  initDataUnsafe?: {
    user?: { id: number; username?: string };
    /**
     * Value of the `startapp=<param>` deep-link parameter that opened
     * this mini-app session. Telegram surfaces it in initData so
     * bootstrap code can route the user back to where they were
     * before an out-of-app round trip (e.g. Google OAuth).
     */
    start_param?: string;
  };
  version?: string;
  platform?: string;
  colorScheme?: string;
  themeParams?: Record<string, string>;
  ready: () => void;
  expand: () => void;
  close: () => void;
  disableVerticalSwipes?: () => void;
  showAlert?: (message: string, callback?: () => void) => void;
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
  /**
   * Opens `url` in the user's OS browser. WebApp's webview is sandboxed
   * and many providers (Google, Apple, Microsoft) block embedded
   * browsers for auth — `openLink` is the only way to land them in a
   * real browser where the OAuth consent screen actually runs.
   */
  openLink?: (
    url: string,
    options?: { try_instant_view?: boolean },
  ) => void;
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

/**
 * Show a blocking notice. Uses Telegram's native `showAlert` when running
 * inside the WebApp (Telegram-styled modal), otherwise falls back to the
 * browser's `alert()` so dev/mobile-web flows still see the message.
 */
export function tgShowAlert(message: string): void {
  try {
    const wa = getWebApp();
    if (wa?.showAlert) {
      wa.showAlert(message);
      return;
    }
  } catch {
    // Fall through to window.alert.
  }
  try {
    window.alert(message);
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

/**
 * Reads the `start_param` (deep-link payload) the mini-app was opened
 * with. Used to resume flows that round-trip out of Telegram — e.g.
 * the Google OAuth callback redirects to
 * `https://t.me/<bot>?startapp=integrations_connected`, Telegram opens
 * the mini-app, and we navigate to the integrations tab on boot.
 *
 * Note: Telegram preserves `start_param` for the entire WebApp
 * session — clear it from app state once consumed so a later soft
 * reload doesn't re-trigger the deep-link action.
 */
export function getTelegramStartParam(): string | null {
  const wa = getWebApp();
  return wa?.initDataUnsafe?.start_param ?? null;
}

/**
 * Opens an external URL in the user's OS browser.
 *
 * Why this exists: Google (and other major OAuth providers) refuse to
 * render their consent screen inside embedded webviews — they detect
 * the Telegram WebView's user agent and return "This browser or app
 * may not be secure". The fix is `WebApp.openLink(url)`, which
 * delegates to the OS browser (Safari / Chrome) where the user is
 * already logged into Google.
 *
 * Outside Telegram (web build) we fall back to `window.open` with a
 * new tab; if that's blocked by a popup blocker we use
 * `window.location.href` as a last resort.
 */
export function tgOpenExternal(url: string): void {
  const wa = getWebApp();
  if (wa?.openLink) {
    try {
      wa.openLink(url);
      return;
    } catch {
      // Fall through to the browser-native paths.
    }
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.href = url;
  }
}
