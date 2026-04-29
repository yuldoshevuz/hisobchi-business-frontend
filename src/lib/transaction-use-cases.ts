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
  label: string;
  description: string;
  icon: LucideIcon;
  sign: TransactionSign;
}

export const TRANSACTION_USE_CASES: Record<
  TransactionUseCase,
  UseCaseDescriptor
> = {
  sale: {
    slug: 'sale',
    label: 'Sotuv',
    description: 'Mahsulot sotildi',
    icon: ShoppingCart,
    sign: 'positive',
  },
  purchase: {
    slug: 'purchase',
    label: 'Mahsulot olib kelish',
    description: 'Tovar sotib olindi yoki qabul qilindi',
    icon: PackagePlus,
    sign: 'negative',
  },
  'credit-sale': {
    slug: 'credit-sale',
    label: 'Qarzga sotuv',
    description: 'Mahsulot qarzga sotildi',
    icon: Tag,
    sign: 'positive',
  },
  expense: {
    slug: 'expense',
    label: 'Xarajat',
    description: 'Oylik, ijara, kommunal va boshqa xarajatlar',
    icon: Receipt,
    sign: 'negative',
  },
  income: {
    slug: 'income',
    label: 'Daromad',
    description: 'Sotuvdan tashqari kirim (foiz, qaytarish, ...)',
    icon: ArrowUpRight,
    sign: 'positive',
  },
  lend: {
    slug: 'lend',
    label: 'Qarz berish',
    description: 'Birovga qarzga berildi',
    icon: HandCoins,
    sign: 'negative',
  },
  borrow: {
    slug: 'borrow',
    label: 'Qarz olish',
    description: 'Birovdan qarz olindi',
    icon: ArrowDownLeft,
    sign: 'positive',
  },
  transfer: {
    slug: 'transfer',
    label: 'Balansdan balansga',
    description: "Hisoblar orasida ko'chirma",
    icon: ArrowRightLeft,
    sign: 'neutral',
  },
  correction: {
    slug: 'correction',
    label: "Balansni to'g'irlash",
    description: "Qoldiqni qo'shish yoki ayirish orqali tuzatish",
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
