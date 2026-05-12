import { CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';
import i18n from '@/i18n';
import type { CommissionStatus } from '@/types/commission.types';

const COMMISSION_STATUS_LABEL_KEY: Record<CommissionStatus, string> = {
  active: 'commissions_meta.status.active',
  voided: 'commissions_meta.status.voided',
};

/** Locale-aware label record — see contact-meta.ts for the proxy
 *  pattern rationale. */
export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> =
  new Proxy(COMMISSION_STATUS_LABEL_KEY, {
    get(target, prop: string) {
      const key = target[prop as CommissionStatus];
      return key ? i18n.t(key) : (prop as string);
    },
  }) as Record<CommissionStatus, string>;

export const COMMISSION_STATUS_VARIANT: Record<
  CommissionStatus,
  'default' | 'secondary' | 'destructive' | 'success' | 'outline'
> = {
  active: 'success',
  voided: 'secondary',
};

export const COMMISSION_STATUS_ICON: Record<CommissionStatus, LucideIcon> = {
  active: CheckCircle2,
  voided: XCircle,
};

/**
 * Colour class pairs (background + foreground) for the 40×40 status leading
 * pill on each commission row. Matches the badge variants above.
 */
export const COMMISSION_STATUS_COLORS: Record<
  CommissionStatus,
  { bg: string; fg: string }
> = {
  active: {
    bg: 'bg-[var(--color-help-success-16)]',
    fg: 'text-[var(--color-help-success)]',
  },
  voided: {
    bg: 'bg-muted',
    fg: 'text-muted-foreground',
  },
};
