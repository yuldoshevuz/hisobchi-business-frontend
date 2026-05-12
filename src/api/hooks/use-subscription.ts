import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '@/api/subscription.api';
import { queryKeys } from '@/api/query-keys';
import i18n from '@/i18n';
import type {
  CurrentSubscription,
  FeatureCode,
  Plan,
} from '@/types/subscription.types';

export function usePlans(): ReturnType<typeof useQuery<Plan[], Error>> {
  return useQuery<Plan[], Error>({
    queryKey: queryKeys.subscription.plans,
    queryFn: () => subscriptionApi.listPlans(),
  });
}

/**
 * Returns the calling user's own subscription. NOTE: in org context the
 * acting plan is the org OWNER's plan, not the member's. Use this hook for
 * "your account" surfaces; for "what can I do in this org?" decisions, the
 * server already enforces the right plan via guards.
 */
export function useCurrentSubscription(
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<CurrentSubscription, Error>> {
  return useQuery<CurrentSubscription, Error>({
    queryKey: queryKeys.subscription.current,
    queryFn: () => subscriptionApi.getCurrent(),
    enabled: options.enabled ?? true,
  });
}

interface FeatureSnapshot {
  /** True once the snapshot has loaded and we know the answer. */
  isReady: boolean;
  /** True only when the BOOLEAN feature is explicitly enabled. */
  isEnabled: boolean;
  /** For LIMIT features: numeric cap; `null` = unlimited; `undefined` = not granted. */
  limit: number | null | undefined;
  /** Convenience: subscription is active and not expired. */
  hasActiveSubscription: boolean;
  /** Convenience: this `code` is gated and missing from the snapshot. */
  isLocked: boolean;
}

/**
 * Read a specific feature's value from the cached subscription snapshot.
 *
 * Lightweight wrapper — pages call this to render lock screens, "Upgrade"
 * CTAs, and per-limit hints without re-implementing the encoding rules.
 */
export function useFeature(code: FeatureCode): FeatureSnapshot {
  const sub = useCurrentSubscription();
  const features = sub.data?.features ?? {};
  const value = features[code];
  const present = code in features;
  return {
    isReady: !sub.isPending,
    isEnabled: value === true,
    limit: typeof value === 'number' || value === null ? value : undefined,
    hasActiveSubscription: sub.data?.subscription?.status === 'active',
    isLocked: sub.isFetched && !present,
  };
}

interface LimitGuardSnapshot {
  isReady: boolean;
  /** Total cap. `null` = cheksiz; `undefined` = tarifda yo'q. */
  limit: number | null | undefined;
  /** Caller-provided current count. */
  current: number;
  /** True when current already met or exceeded the cap. */
  isAtLimit: boolean;
  /** True when the LIMIT row is missing from the plan entirely. */
  isLocked: boolean;
  /**
   * True when the user can still create one more — false if `isAtLimit`
   * or `isLocked`. Stays true while the snapshot is loading (optimistic).
   */
  canCreate: boolean;
  /** Convenience text: e.g. "5 / 10" or "Cheksiz" or "Tarifda yo'q". */
  label: string;
}

/**
 * Pair a LIMIT feature with the resource's live count so callers can
 * disable Create buttons exactly when the cap is reached.
 *
 * Pass `current` from your existing list query (e.g. `accounts.length`).
 * The hook treats `null` limit as cheksiz — `canCreate` always true.
 */
export function useLimitGuard(
  code: FeatureCode,
  current: number,
): LimitGuardSnapshot {
  const snap = useFeature(code);
  const limit = snap.limit;
  const isLocked = snap.isReady && snap.isLocked;
  const isAtLimit =
    typeof limit === 'number' && limit > 0 && current >= limit;
  const canCreate = !isLocked && !isAtLimit;
  let label: string;
  if (!snap.isReady) label = '...';
  else if (isLocked) label = i18n.t('limit_guard.not_in_plan');
  else if (limit === null) label = i18n.t('limit_guard.unlimited');
  else if (typeof limit === 'number') label = `${current} / ${limit}`;
  else label = '—';

  return {
    isReady: snap.isReady,
    limit,
    current,
    isAtLimit,
    isLocked,
    canCreate,
    label,
  };
}
