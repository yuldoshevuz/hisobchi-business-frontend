import { useEffect } from 'react';
import { setBackButton } from '@/lib/telegram';

export function useTelegramBackButton(handler: (() => void) | null): void {
  useEffect(() => {
    return setBackButton(handler);
  }, [handler]);
}
