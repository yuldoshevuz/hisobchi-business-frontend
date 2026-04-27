import type { ListAccountsQuery } from '@/types/account.types';
import type {
  ListCategoriesQuery,
  ListSystemCategoriesQuery,
} from '@/types/category.types';
import type { ListMembersQuery } from '@/types/member.types';

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
};
