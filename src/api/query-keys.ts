import type { ListAccountsQuery } from '@/types/account.types';
import type {
  ListCategoriesQuery,
  ListSystemCategoriesQuery,
} from '@/types/category.types';
import type { ListCommissionsQuery } from '@/types/commission.types';
import type { ListContactsQuery } from '@/types/contact.types';
import type { ListMembersQuery } from '@/types/member.types';
import type { ListProductsQuery } from '@/types/product.types';
import type {
  ListScheduledQuery,
  ListScheduledRemindersQuery,
} from '@/types/scheduled.types';
import type {
  ListSalesQuery,
  ListTransactionsQuery,
} from '@/types/transaction.types';

export const queryKeys = {
  user: {
    me: ['user', 'me'] as const,
  },
  organizations: {
    list: ['organizations', 'list'] as const,
    current: ['organizations', 'current'] as const,
  },
  members: {
    all: ['members'] as const,
    list: (query: ListMembersQuery): readonly unknown[] => [
      'members',
      'list',
      query,
    ],
    summary: (id: number): readonly unknown[] => ['members', 'summary', id],
    profile: (id: number): readonly unknown[] => ['members', 'profile', id],
    orgSummary: ['members', 'org-summary'] as const,
  },
  rbac: {
    permissions: ['rbac', 'permissions'] as const,
    roles: ['rbac', 'roles'] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    list: (query: ListAccountsQuery): readonly unknown[] => [
      'accounts',
      'list',
      query,
    ],
    detail: (id: number): readonly unknown[] => ['accounts', 'detail', id],
  },
  categories: {
    all: ['categories'] as const,
    list: (query: ListCategoriesQuery): readonly unknown[] => [
      'categories',
      'list',
      query,
    ],
    detail: (id: number): readonly unknown[] => ['categories', 'detail', id],
    system: (query: ListSystemCategoriesQuery): readonly unknown[] => [
      'categories',
      'system',
      query,
    ],
  },
  clients: {
    all: ['clients'] as const,
    list: (query: ListContactsQuery): readonly unknown[] => [
      'clients',
      'list',
      query,
    ],
    detail: (id: number): readonly unknown[] => ['clients', 'detail', id],
    balance: (id: number): readonly unknown[] => ['clients', 'balance', id],
  },
  products: {
    all: ['products'] as const,
    list: (query: ListProductsQuery): readonly unknown[] => [
      'products',
      'list',
      query,
    ],
    detail: (id: number): readonly unknown[] => ['products', 'detail', id],
  },
  transactions: {
    all: ['transactions'] as const,
    list: (query: ListTransactionsQuery): readonly unknown[] => [
      'transactions',
      'list',
      query,
    ],
    detail: (id: number): readonly unknown[] => ['transactions', 'detail', id],
  },
  sales: {
    all: ['sales'] as const,
    list: (query: ListSalesQuery): readonly unknown[] => [
      'sales',
      'list',
      query,
    ],
    detail: (id: number): readonly unknown[] => ['sales', 'detail', id],
  },
  reports: {
    all: ['reports'] as const,
    cashFlow: (query: unknown): readonly unknown[] => [
      'reports',
      'cash-flow',
      query,
    ],
    cashFlowTimeseries: (query: unknown): readonly unknown[] => [
      'reports',
      'cash-flow-timeseries',
      query,
    ],
    pnl: (query: unknown): readonly unknown[] => ['reports', 'pnl', query],
    financialState: (query: unknown): readonly unknown[] => [
      'reports',
      'financial-state',
      query,
    ],
    contacts: (query: unknown): readonly unknown[] => [
      'reports',
      'contacts',
      query,
    ],
  },
  scheduled: {
    all: ['scheduled'] as const,
    list: (query: ListScheduledQuery): readonly unknown[] => [
      'scheduled',
      'list',
      query,
    ],
    detail: (id: number): readonly unknown[] => ['scheduled', 'detail', id],
    reminders: {
      all: ['scheduled-reminders'] as const,
      list: (query: ListScheduledRemindersQuery): readonly unknown[] => [
        'scheduled-reminders',
        'list',
        query,
      ],
    },
  },
  currencyRates: {
    all: ['currency-rates'] as const,
    list: ['currency-rates', 'list'] as const,
  },
  commissions: {
    all: ['commissions'] as const,
    list: (query: ListCommissionsQuery): readonly unknown[] => [
      'commissions',
      'list',
      query,
    ],
    detail: (id: number): readonly unknown[] => ['commissions', 'detail', id],
    summary: ['commissions', 'summary'] as const,
  },
  subscription: {
    all: ['subscription'] as const,
    plans: ['subscription', 'plans'] as const,
    current: ['subscription', 'current'] as const,
  },
  payments: {
    all: ['payments'] as const,
    invoice: (id: number): readonly unknown[] => ['payments', 'invoice', id],
  },
};
