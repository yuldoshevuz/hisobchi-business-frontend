import { useEffect, useRef } from 'react';
import { setMainButton, type TelegramMainButtonOptions } from '@/lib/telegram';

/**
 * Bind the Telegram WebApp MainButton to the current screen.
 * Pass `null` to hide it. The handler is read from a ref so inline closures
 * don't tear down the button on every keystroke.
 */
export function useTelegramMainButton(opts: TelegramMainButtonOptions | null): void {
  const handlerRef = useRef<TelegramMainButtonOptions['onClick'] | null>(null);

  useEffect(() => {
    handlerRef.current = opts?.onClick ?? null;
  });

  const text = opts?.text;
  const visible = opts?.visible;
  const enabled = opts?.enabled;
  const showProgress = opts?.showProgress;
  const color = opts?.color;
  const textColor = opts?.textColor;

  useEffect(() => {
    if (!text) return;
    return setMainButton({
      text,
      onClick: () => handlerRef.current?.(),
      visible,
      enabled,
      showProgress,
      color,
      textColor,
    });
  }, [text, visible, enabled, showProgress, color, textColor]);
}
