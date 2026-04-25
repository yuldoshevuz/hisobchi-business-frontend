import { type ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import type { PermissionSlug } from '@/lib/permission-slugs';

interface CanProps {
  /** Single slug, or an array — caller picks AND vs OR via `mode`. */
  slug?: PermissionSlug;
  slugs?: PermissionSlug[];
  /** Default `"all"` — every slug must be granted. `"any"` — at least one. */
  mode?: 'all' | 'any';
  children: ReactNode;
  /** Rendered when the user lacks the required permission(s). */
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on the caller's permissions.
 * Returns `fallback` (or null) while permissions are still loading — UI does
 * not flash "allowed" state before viewer context arrives.
 */
export function Can({
  slug,
  slugs,
  mode = 'all',
  children,
  fallback = null,
}: CanProps): React.ReactElement | null {
  const { isReady, has, hasAll, hasAny } = usePermissions();

  if (!isReady) return <>{fallback}</>;

  const required: PermissionSlug[] = slug ? [slug] : (slugs ?? []);
  if (required.length === 0) return <>{children}</>;

  const allowed =
    required.length === 1
      ? has(required[0])
      : mode === 'any'
        ? hasAny(...required)
        : hasAll(...required);

  return <>{allowed ? children : fallback}</>;
}
