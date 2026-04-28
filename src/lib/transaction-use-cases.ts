import {
  ArrowDownLeft,
  ArrowRightLeft,
  PackagePlus,
  ShoppingCart,
  Sliders,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import type { TransactionSign } from './transaction-meta';

/**
 * Five business actions exposed on the dashboard. Each maps to one (or one
 * narrow variant) of the underlying transaction `type` in the backend, but
 * the UI never speaks DB enum slugs to the user. The slug here is the URL
 * routing key (`/transactions/new/<slug>`).
 */
export type TransactionUseCase =
  | 'sale'
  | 'purchase'
  | 'credit-sale'
  | 'borrow'
  | 'transfer'
  | 'correction';

export const TRANSACTION_USE_CASE_VALUES: readonly TransactionUseCase[] = [
  'sale',
  'purchase',
  'credit-sale',
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

/** Same order as cards on the dashboard grid. */
export const DASHBOARD_USE_CASES: TransactionUseCase[] = [
  'sale',
  'purchase',
  'credit-sale',
  'borrow',
  'transfer',
  'correction',
];
