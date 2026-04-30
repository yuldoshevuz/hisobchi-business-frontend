import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFeature } from '@/api/hooks/use-subscription';
import { FeatureLockedView } from '@/components/FeatureLockedView';
import { Spinner } from '@/components/ui/spinner';
import { getFeatureLabel } from '@/lib/feature-i18n';
import { tgHapticImpact } from '@/lib/telegram';
import type { FeatureCode } from '@/types/subscription.types';

interface FeatureGateProps {
  feature: FeatureCode;
  children: React.ReactNode;
  /**
   * Lock layout:
   *   - "page"   → renders the full lock screen with PageHeader (default)
   *   - "block"  → renders an inline locked card (no PageHeader)
   *   - "banner" → small lock banner on top, hides children
   *   - "hide"   → renders nothing when locked (use the helper hook for CTAs)
   */
  variant?: 'page' | 'block' | 'banner' | 'hide';
  /** Pass through to the lock view; defaults to feature i18n. */
  title?: string;
  /** Pass through to the lock view; defaults to feature i18n description. */
  description?: string;
  /** Spinner shown while the subscription snapshot is loading. */
  loadingFallback?: React.ReactNode;
}

/**
 * Renders `children` only when the BOOLEAN feature is enabled in the calling
 * user's subscription snapshot. Otherwise shows a plan-aware lock UI.
 *
 * Use `variant="block"` inside larger pages (e.g. report tabs) so you don't
 * stack two PageHeaders.
 */
export function FeatureGate({
  feature,
  children,
  variant = 'page',
  title,
  description,
  loadingFallback,
}: FeatureGateProps): React.ReactElement {
  const snap = useFeature(feature);

  if (!snap.isReady) {
    return (
      <>
        {loadingFallback ?? (
          <div className="flex justify-center py-10">
            <Spinner className="h-5 w-5" />
          </div>
        )}
      </>
    );
  }

  if (snap.isEnabled) {
    return <>{children}</>;
  }

  if (variant === 'hide') return <></>;

  if (variant === 'banner') {
    return (
      <FeatureLockedBanner
        feature={feature}
        description={description}
        title={title}
      />
    );
  }

  return (
    <FeatureLockedView
      feature={feature}
      title={title}
      description={description}
      embedded={variant === 'block'}
    />
  );
}

function FeatureLockedBanner({
  feature,
  title,
  description,
}: {
  feature: FeatureCode;
  title?: string;
  description?: string;
}): React.ReactElement {
  const navigate = useNavigate();
  const label = getFeatureLabel(feature);
  return (
    <div className="mx-4 my-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
        <Lock className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="text-[13px] font-medium text-amber-900">
          {title ?? label.name}
        </div>
        <p className="text-[12px] text-amber-800">
          {description ?? label.description}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-300 bg-white"
        onClick={() => {
          tgHapticImpact('light');
          navigate('/plans');
        }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Tariflar
      </Button>
    </div>
  );
}
