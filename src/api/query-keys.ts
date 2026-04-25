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
};
