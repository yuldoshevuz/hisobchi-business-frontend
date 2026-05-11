import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  HandCoins,
  PackagePlus,
  Receipt,
  ShoppingCart,
  Sliders,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import type { TransactionSign } from './transaction-meta';

/**
 * Business actions exposed in the create flow. Each maps to one (or one
 * narrow variant) of the underlying transaction `type` in the backend, but
 * the UI never speaks DB enum slugs to the user. The slug here is the URL
 * routing key (`/transactions/new/<slug>`).
 *
 * Opening balance does NOT have a use-case: the amount is captured in the
 * Create Account form and the backend records the OPENING_BALANCE
 * transaction automatically.
 */
export type TransactionUseCase =
  | 'sale'
  | 'purchase'
  | 'credit-sale'
  | 'expense'
  | 'income'
  | 'lend'
  | 'borrow'
  | 'transfer'
  | 'correction';

export const TRANSACTION_USE_CASE_VALUES: readonly TransactionUseCase[] = [
  'sale',
  'purchase',
  'credit-sale',
  'expense',
  'income',
  'lend',
  'borrow',
  'transfer',
  'correction',
] as const;

interface UseCaseDescriptor {
  slug: TransactionUseCase;
  /** i18n key for the user-facing label. Resolved via t() at call sites. */
  labelKey: string;
  /** i18n key for the one-line description. */
  descriptionKey: string;
  icon: LucideIcon;
  sign: TransactionSign;
}

export const TRANSACTION_USE_CASES: Record<
  TransactionUseCase,
  UseCaseDescriptor
> = {
  sale: {
    slug: 'sale',
    labelKey: 'use_case.sale.label',
    descriptionKey: 'use_case.sale.description',
    icon: ShoppingCart,
    sign: 'positive',
  },
  purchase: {
    slug: 'purchase',
    labelKey: 'use_case.purchase.label',
    descriptionKey: 'use_case.purchase.description',
    icon: PackagePlus,
    sign: 'negative',
  },
  'credit-sale': {
    slug: 'credit-sale',
    labelKey: 'use_case.credit-sale.label',
    descriptionKey: 'use_case.credit-sale.description',
    icon: Tag,
    sign: 'positive',
  },
  expense: {
    slug: 'expense',
    labelKey: 'use_case.expense.label',
    descriptionKey: 'use_case.expense.description',
    icon: Receipt,
    sign: 'negative',
  },
  income: {
    slug: 'income',
    labelKey: 'use_case.income.label',
    descriptionKey: 'use_case.income.description',
    icon: ArrowUpRight,
    sign: 'positive',
  },
  lend: {
    slug: 'lend',
    labelKey: 'use_case.lend.label',
    descriptionKey: 'use_case.lend.description',
    icon: HandCoins,
    sign: 'negative',
  },
  borrow: {
    slug: 'borrow',
    labelKey: 'use_case.borrow.label',
    descriptionKey: 'use_case.borrow.description',
    icon: ArrowDownLeft,
    sign: 'positive',
  },
  transfer: {
    slug: 'transfer',
    labelKey: 'use_case.transfer.label',
    descriptionKey: 'use_case.transfer.description',
    icon: ArrowRightLeft,
    sign: 'neutral',
  },
  correction: {
    slug: 'correction',
    labelKey: 'use_case.correction.label',
    descriptionKey: 'use_case.correction.description',
    icon: Sliders,
    sign: 'neutral',
  },
};

/**
 * Order of the cards on the dashboard grid.
 *
 * Excluded on purpose:
 *   • `credit-sale` — Sotuv form has an inline "Qarzga sotdim" toggle.
 *   • `transfer` — entry point is the account chip → "Balansdan balansga
 *     o'tkazish" action; pre-fills the source account from URL.
 *   • `correction` — entry point is the account chip → "Balansni tahrirlash"
 *     form, where the user enters the actual balance and the diff is recorded
 *     as an adjustment automatically.
 *
 * The URLs `/transactions/new/credit-sale|transfer|correction` still resolve
 * (via the switch in TransactionCreatePage) for old deep links.
 */
export const DASHBOARD_USE_CASES: TransactionUseCase[] = [
  'sale',
  'purchase',
  'expense',
  'income',
  'lend',
  'borrow',
];
