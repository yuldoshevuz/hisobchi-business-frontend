import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { getFeatureLabel } from '@/lib/feature-i18n';
import { tgHapticImpact } from '@/lib/telegram';
import type { FeatureCode } from '@/types/subscription.types';

interface FeatureLockedViewProps {
  feature: FeatureCode;
  /** Override the page title; defaults to the feature's Uzbek name. */
  title?: string;
  /** Override the description; defaults to the feature's i18n description. */
  description?: string;
  /** Optional reason text under the lock icon (e.g. limit details). */
  hint?: string;
  /** Hide the wrapping `<PageHeader>` when embedding inline. */
  embedded?: boolean;
}

/**
 * Page-level "this is locked" view shown when the calling user's plan
 * doesn't grant the requested feature. Uzbek labels come from the i18n
 * map; the CTA always lands on the Tariflar page.
 */
export function FeatureLockedView({
  feature,
  title,
  description,
  hint,
  embedded = false,
}: FeatureLockedViewProps): React.ReactElement {
  const navigate = useNavigate();
  const label = getFeatureLabel(feature);
  const heading = title ?? label.name;
  const desc = description ?? label.description;

  function goToPlans(): void {
    tgHapticImpact('light');
    navigate('/plans');
  }

  const body = (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Lock className="h-7 w-7" />
      </div>
      <p className="mt-4 text-[15px] font-medium">
        Bu imkoniyat sizning tarifingizda yoqilmagan
      </p>
      {desc ? (
        <p className="mt-2 text-[13px] text-muted-foreground">{desc}</p>
      ) : null}
      {hint ? (
        <p className="mt-2 text-[13px] text-muted-foreground">{hint}</p>
      ) : null}
      <Button className="mt-6" size="lg" onClick={goToPlans}>
        <Sparkles className="h-4 w-4" />
        Tariflarni ko&apos;rish
      </Button>
    </div>
  );

  if (embedded) return body;

  return (
    <div className="pb-32">
      <PageHeader title={heading} large showBack />
      {body}
    </div>
  );
}
