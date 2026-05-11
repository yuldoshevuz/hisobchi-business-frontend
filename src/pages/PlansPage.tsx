import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  Check,
  CreditCard,
  Infinity as InfinityIcon,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import {
  useCurrentSubscription,
  usePlans,
} from '@/api/hooks/use-subscription';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { ListItem, Section } from '@/components/ui/list-item';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  BOOLEAN_FEATURE_CODES_UZ,
  LIMIT_FEATURE_CODES_UZ,
  getFeatureLabel,
} from '@/lib/feature-i18n';
import { cn } from '@/lib/utils';
import type { CurrentSubscription, Plan } from '@/types/subscription.types';

const SUBSCRIPTION_STATUS_KEY: Record<string, string> = {
  active: 'plans_page.status.active',
  expired: 'plans_page.status.expired',
  cancelled: 'plans_page.status.cancelled',
};

export function PlansPage(): React.ReactElement {
  const { t } = useTranslation();
  const current = useCurrentSubscription();
  const plans = usePlans();

  return (
    <div className="pb-8">
      <PageHeader
        title={t('plans_page.title')}
        description={t('plans_page.subtitle')}
        large
        showBack
      />

      <div className="space-y-6">
        <CurrentSubscriptionCard
          data={current.data}
          loading={current.isPending}
          error={current.error}
        />

        <PlansSection
          plans={plans.data ?? []}
          loading={plans.isPending}
          error={plans.error}
          currentPlanId={current.data?.plan?.id ?? null}
        />

        <UpgradeNoteCard />
      </div>
    </div>
  );
}

// ─── Current subscription ──────────────────────────────────────────────────

function CurrentSubscriptionCard({
  data,
  loading,
  error,
}: {
  data: CurrentSubscription | undefined;
  loading: boolean;
  error: Error | null;
}): React.ReactElement {
  const { t } = useTranslation();
  if (loading) {
    return (
      <Section>
        <div className="flex justify-center py-6">
          <Spinner className="h-5 w-5" />
        </div>
      </Section>
    );
  }
  if (error) {
    return (
      <Section>
        <ListItem
          asStatic
          title={
            <span className="text-destructive">{getApiErrorMessage(error)}</span>
          }
        />
      </Section>
    );
  }
  if (!data || (data.subscription === null && data.plan === null)) {
    return (
      <Section title={t('plans_page.current_subscription')}>
        <div className="px-4 py-6 text-center text-[14px] text-muted-foreground">
          {t('plans_page.no_subscription')}
        </div>
      </Section>
    );
  }

  const sub = data.subscription;
  const plan = data.plan;
  const statusKey = sub ? SUBSCRIPTION_STATUS_KEY[sub.status] : null;

  return (
    <Section title={t('plans_page.current_subscription')}>
      <ListItem
        asStatic
        leading={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
        }
        title={
          <span className="flex items-center gap-2">
            <span className="font-semibold">{plan?.name ?? '—'}</span>
            {plan?.isDefault ? (
              <Badge variant="secondary" className="text-[10px]">
                {t('plans_page.default_badge')}
              </Badge>
            ) : null}
            {sub ? (
              <Badge
                variant={sub.status === 'active' ? 'success' : 'secondary'}
                className="text-[10px]"
              >
                {statusKey ? t(statusKey) : sub.status}
              </Badge>
            ) : null}
          </span>
        }
        subtitle={
          sub ? (
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-3 w-3" />
              {sub.endDate
                ? t('plans_page.ends_on', { date: formatDateUz(sub.endDate) })
                : t('plans_page.unlimited_duration')}
            </span>
          ) : null
        }
      />

      {plan ? <FeaturesPreview plan={plan} /> : null}
    </Section>
  );
}

function FeaturesPreview({ plan }: { plan: Plan }): React.ReactElement {
  const { t } = useTranslation();
  const byCode = useMemo(
    () => new Map(plan.features.map((f) => [f.featureCode, f] as const)),
    [plan.features],
  );

  return (
    <div className="space-y-2 px-4 pb-4 pt-2">
      <div className="text-[12px] font-medium text-muted-foreground">
        {t('plans_page.available_features')}
      </div>
      <div className="space-y-1.5">
        {LIMIT_FEATURE_CODES_UZ.map((code) => {
          const i18n = getFeatureLabel(code);
          const row = byCode.get(code);
          return (
            <FeatureLine
              key={code}
              name={i18n.name}
              value={
                !row
                  ? null
                  : row.limit === null
                    ? 'unlimited'
                    : t('plans_page.count_unit', { count: row.limit })
              }
            />
          );
        })}
        {BOOLEAN_FEATURE_CODES_UZ.map((code) => {
          const i18n = getFeatureLabel(code);
          const row = byCode.get(code);
          const enabled = row?.isEnabled ?? false;
          return <FeatureLine key={code} name={i18n.name} enabled={enabled} />;
        })}
      </div>
    </div>
  );
}

function FeatureLine({
  name,
  value,
  enabled,
}: {
  name: string;
  /** For LIMITs: 'unlimited' | formatted count | null=not available. */
  value?: string | null;
  /** For BOOLEAN: true=on, false=off. */
  enabled?: boolean;
}): React.ReactElement {
  const { t } = useTranslation();
  if (value !== undefined) {
    return (
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-foreground">{name}</span>
        {value === null ? (
          <span className="text-muted-foreground">—</span>
        ) : value === 'unlimited' ? (
          <span className="flex items-center gap-1 text-green-600">
            <InfinityIcon className="h-3.5 w-3.5" />
            {t('plans_page.unlimited')}
          </span>
        ) : (
          <span className="font-medium tabular-nums">{value}</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className={cn(enabled ? 'text-foreground' : 'text-muted-foreground')}>
        {name}
      </span>
      {enabled ? (
        <span className="flex items-center gap-1 text-green-600">
          <Check className="h-3.5 w-3.5" />
          {t('plans_page.enabled')}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          {t('plans_page.disabled')}
        </span>
      )}
    </div>
  );
}

// ─── Available plans ───────────────────────────────────────────────────────

function PlansSection({
  plans,
  loading,
  error,
  currentPlanId,
}: {
  plans: Plan[];
  loading: boolean;
  error: Error | null;
  currentPlanId: number | null;
}): React.ReactElement {
  const { t } = useTranslation();
  if (loading) {
    return (
      <Section title={t('plans_page.available_plans')}>
        <div className="flex justify-center py-6">
          <Spinner className="h-5 w-5" />
        </div>
      </Section>
    );
  }
  if (error) {
    return (
      <Section title={t('plans_page.available_plans')}>
        <ListItem
          asStatic
          title={
            <span className="text-destructive">{getApiErrorMessage(error)}</span>
          }
        />
      </Section>
    );
  }
  if (plans.length === 0) {
    return (
      <Section title={t('plans_page.available_plans')}>
        <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
          {t('plans_page.no_plans')}
        </div>
      </Section>
    );
  }

  return (
    <Section title={t('plans_page.available_plans')}>
      <div className="space-y-3 px-4 pb-4 pt-2">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.id === currentPlanId}
          />
        ))}
      </div>
    </Section>
  );
}

function PlanCard({
  plan,
  isCurrent,
}: {
  plan: Plan;
  isCurrent: boolean;
}): React.ReactElement {
  const { t } = useTranslation();
  const activePrices = plan.prices.filter((p) => p.isActive);
  const planFeatures = useMemo(
    () => new Map(plan.features.map((f) => [f.featureCode, f] as const)),
    [plan.features],
  );
  const enabledBooleans = BOOLEAN_FEATURE_CODES_UZ.filter(
    (code) => planFeatures.get(code)?.isEnabled,
  );

  return (
    <div
      className={cn(
        'rounded-xl border bg-card px-4 py-3',
        isCurrent ? 'border-primary ring-1 ring-primary/20' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] font-semibold">{plan.name}</span>
            {plan.isDefault ? (
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            ) : null}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {plan.code}
          </div>
        </div>
        {isCurrent ? (
          <Badge variant="success" className="text-[10px]">
            {t('plans_page.current_badge')}
          </Badge>
        ) : null}
      </div>

      {activePrices.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {activePrices.map((price) => (
            <div
              key={price.id}
              className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-[13px]"
            >
              <span className="text-muted-foreground">
                {t('plans_page.duration_days', { count: price.durationDays })}
              </span>
              <span className="font-semibold tabular-nums">
                {Number(price.price).toLocaleString('uz-UZ')} {price.currency}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-md bg-green-50 px-3 py-1.5 text-[13px] text-green-700">
          {t('plans_page.free_plan')}
        </div>
      )}

      {enabledBooleans.length > 0 ? (
        <div className="mt-3">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('plans_page.feature_list_label')}
          </div>
          <ul className="space-y-1">
            {enabledBooleans.map((code) => {
              const i18n = getFeatureLabel(code);
              return (
                <li
                  key={code}
                  className="flex items-start gap-1.5 text-[13px]"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                  <span>{i18n.name}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ─── Upgrade note ──────────────────────────────────────────────────────────

function UpgradeNoteCard(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Section>
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-[14px] font-medium">
              {t('plans_page.upgrade_title')}
            </div>
            <p className="text-[13px] text-muted-foreground">
              {t('plans_page.upgrade_description')}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const MONTHS_UZ_SHORT = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn',
  'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
] as const;

function formatDateUz(iso: string): string {
  const [datePart] = iso.split('T');
  const [y, m, d] = (datePart ?? '').split('-').map((p) => Number(p));
  if (!y || !m || !d) return iso;
  return `${d.toString().padStart(2, '0')} ${MONTHS_UZ_SHORT[m - 1]} ${y}`;
}
