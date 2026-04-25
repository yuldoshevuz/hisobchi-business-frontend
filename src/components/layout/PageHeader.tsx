import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  large?: boolean;
}

export function PageHeader({
  title,
  description,
  action,
  className,
  large = false,
}: PageHeaderProps): React.ReactElement {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 safe-top',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-end justify-between gap-3 px-4',
          large ? 'pb-3 pt-5' : 'py-3',
        )}
      >
        <div className="min-w-0">
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
