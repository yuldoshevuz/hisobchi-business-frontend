import { CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';
import type { CommissionStatus } from '@/types/commission.types';

export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> = {
  active: 'Faol',
  voided: 'Bekor qilingan',
};

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
