import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useTelegramBackButton } from '@/hooks/use-tg-back-button';
import { tgHapticImpact } from '@/lib/telegram';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  large?: boolean;
  /** Show an iOS-style chevron back button on the left. */
  showBack?: boolean;
  /** Override the back behaviour. Defaults to `navigate(-1)`. */
  onBack?: () => void;
}

export function PageHeader({
  title,
  description,
  action,
  className,
  large = false,
  showBack = false,
  onBack,
}: PageHeaderProps): React.ReactElement {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    tgHapticImpact('light');
    if (onBack) onBack();
    else navigate(-1);
  }, [onBack, navigate]);

  // Mirror the back affordance on Telegram's native BackButton so swipe-back
  // and the platform chevron behave identically.
  useTelegramBackButton(showBack ? handleBack : null);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 safe-top',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-end gap-2 px-4',
          large ? 'pb-3 pt-5' : 'py-3',
        )}
      >
        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Orqaga"
            className="press -ml-2 mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary active:bg-accent"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              'truncate font-semibold text-foreground',
              large ? 'text-[28px] leading-tight' : 'text-[17px] leading-tight',
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 pb-0.5">{action}</div> : null}
      </div>
    </header>
  );
}
