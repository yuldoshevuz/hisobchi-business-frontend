import { useMemo } from 'react';
import { useCurrentOrganization } from '@/api/hooks/use-organizations';
import type { PermissionSlug } from '@/lib/permission-slugs';

export interface PermissionsState {
  /** True until the current-organization request has loaded at least once. */
  isLoading: boolean;
  /** Ready to make permission decisions (response present). */
  isReady: boolean;
  /** Caller's permission slugs as a Set for O(1) lookups. */
  slugs: Set<string>;
  /** Caller's role names (e.g. `['Owner']`). */
  roleNames: string[];
  /** True if the slug is in the set. Returns false while loading. */
  has: (slug: PermissionSlug) => boolean;
  /** True if ANY of the listed slugs is granted. */
  hasAny: (...slugs: PermissionSlug[]) => boolean;
  /** True only if EVERY listed slug is granted. */
  hasAll: (...slugs: PermissionSlug[]) => boolean;
}

export function usePermissions(): PermissionsState {
  const { data, isPending } = useCurrentOrganization();

  return useMemo<PermissionsState>(() => {
    const list = data?.viewer.permissionSlugs ?? [];
    const slugs = new Set<string>(list);
    return {
      isLoading: isPending,
      isReady: Boolean(data),
      slugs,
      roleNames: data?.viewer.roleNames ?? [],
      has: (slug) => slugs.has(slug),
      hasAny: (...needed) => needed.some((s) => slugs.has(s)),
      hasAll: (...needed) => needed.every((s) => slugs.has(s)),
    };
  }, [data, isPending]);
}

/** Convenience: single-slug variant for inline JSX checks. */
export function useCan(slug: PermissionSlug): boolean {
  const { has } = usePermissions();
  return has(slug);
}
