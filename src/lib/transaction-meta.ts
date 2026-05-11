import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Flag,
  HelpCircle,
  Package,
  Receipt,
  ShoppingCart,
  Sliders,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import i18n from '@/i18n';
import type {
  CashFlowDirection,
  PaymentStatus,
  TransactionType,
} from '@/types/transaction.types';

export const TRANSACTION_TYPE_LABEL_KEY: Record<TransactionType, string> = {
  sale: 'tx.type.sale',
  purchase: 'tx.type.purchase',
  expense: 'tx.type.expense',
  income: 'tx.type.income',
  debt_out: 'tx.type.debt_out',
  debt_in: 'tx.type.debt_in',
  transfer: 'tx.type.transfer',
  adjustment: 'tx.type.adjustment',
  opening_balance: 'tx.type.opening_balance',
  suspense: 'tx.type.suspense',
};

/** Locale-aware label record. Reading any property runs the key through
 *  the live i18n instance, so the value follows the active language.
 *  See account-meta.ts for the same pattern. */
export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = new Proxy(
  TRANSACTION_TYPE_LABEL_KEY,
  {
    get(target, prop: string) {
      const key = target[prop as TransactionType];
      return key ? i18n.t(key) : (prop as string);
    },
  },
) as Record<TransactionType, string>;

export const TRANSACTION_TYPE_ICON: Record<TransactionType, LucideIcon> = {
  sale: ShoppingCart,
  purchase: Package,
  expense: Receipt,
  income: TrendingUp,
  debt_out: ArrowUpRight,
  debt_in: ArrowDownLeft,
  transfer: ArrowRightLeft,
  adjustment: Sliders,
  opening_balance: Flag,
  suspense: HelpCircle,
};

/** `+` (credit) / `-` (debit) / null (neutral) — derived from type, not direction. */
export type TransactionSign = 'positive' | 'negative' | 'neutral';

export const TRANSACTION_TYPE_SIGN: Record<TransactionType, TransactionSign> = {
  sale: 'positive',
  income: 'positive',
  debt_in: 'positive',
  opening_balance: 'positive',
  purchase: 'negative',
  expense: 'negative',
  debt_out: 'negative',
  transfer: 'neutral',
  adjustment: 'neutral',
  suspense: 'neutral',
};

export const PAYMENT_STATUS_LABEL_KEY: Record<PaymentStatus, string> = {
  unpaid: 'payment_status.unpaid',
  partial: 'payment_status.partial',
  paid: 'payment_status.paid',
  overpaid: 'payment_status.overpaid',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = new Proxy(
  PAYMENT_STATUS_LABEL_KEY,
  {
    get(target, prop: string) {
      const key = target[prop as PaymentStatus];
      return key ? i18n.t(key) : (prop as string);
    },
  },
) as Record<PaymentStatus, string>;

/** Maps Badge variants used in the project. */
export const PAYMENT_STATUS_VARIANT: Record<
  PaymentStatus,
  'default' | 'secondary' | 'success' | 'destructive'
> = {
  unpaid: 'destructive',
  partial: 'secondary',
  paid: 'success',
  overpaid: 'default',
};

/** Whether the type should expose payment_status badges + repayment actions. */
export function typeHasPaymentLifecycle(type: TransactionType): boolean {
  return (
    type === 'sale' ||
    type === 'purchase' ||
    type === 'expense' ||
    type === 'income' ||
    type === 'debt_out' ||
    type === 'debt_in'
  );
}

/** Direction of a repayment cash_flow given the parent transaction type. */
export function repaymentDirection(
  type: TransactionType,
): CashFlowDirection | null {
  if (type === 'sale' || type === 'income' || type === 'debt_out') return 'in';
  if (type === 'purchase' || type === 'expense' || type === 'debt_in')
    return 'out';
  return null;
}

/** Direction expected for the FIRST cash_flow at create time. */
export function expectedCreateDirection(
  type: TransactionType,
): CashFlowDirection | 'either' | 'none' {
  switch (type) {
    case 'sale':
    case 'income':
    case 'debt_in':
      return 'in';
    case 'purchase':
    case 'expense':
    case 'debt_out':
      return 'out';
    case 'opening_balance':
      return 'none';
    case 'transfer':
    case 'adjustment':
    case 'suspense':
      return 'either';
  }
}

/** True if `type` requires a non-empty `categoryId` / `systemCategoryId`. */
export function typeRequiresCategory(type: TransactionType): boolean {
  return type !== 'transfer' && type !== 'opening_balance';
}

/**
 * Human-readable description for a transaction. Falls back to the localized
 * type label when the user-entered description is empty/null — most creation
 * forms no longer expose a description field, so almost every row will go
 * through the fallback path.
 */
export function transactionDescription(tx: {
  type: TransactionType;
  description: string | null;
}): string {
  return tx.description?.trim() || TRANSACTION_TYPE_LABEL[tx.type];
}
