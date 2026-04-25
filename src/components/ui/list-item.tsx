import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ListItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  asStatic?: boolean;
}

export const ListItem = React.forwardRef<HTMLButtonElement, ListItemProps>(
  (
    {
      leading,
      title,
      subtitle,
      trailing,
      showChevron = false,
      asStatic = false,
      className,
      onClick,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const inner = (
      <>
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-[15px] font-medium leading-tight text-foreground">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {subtitle}
            </div>
          ) : null}
        </div>
        {trailing ? (
          <div className="shrink-0 text-muted-foreground">{trailing}</div>
        ) : null}
        {showChevron ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : null}
      </>
    );

    if (asStatic) {
      return (
        <div
          className={cn('flex items-center gap-3 px-4 py-3', className)}
        >
          {inner}
        </div>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        className={cn(
          'press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent',
          className,
        )}
        {...props}
      >
        {inner}
      </button>
    );
  },
);
ListItem.displayName = 'ListItem';

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  footer?: React.ReactNode;
}

export function Section({
  title,
  footer,
  className,
  children,
  ...props
}: SectionProps): React.ReactElement {
  return (
    <section className={cn('px-4', className)} {...props}>
      {title ? (
        <div className="px-1 pb-1.5 pt-4 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
      ) : null}
      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
        {children}
      </div>
      {footer ? (
        <div className="px-1 pt-1.5 text-[12px] text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
