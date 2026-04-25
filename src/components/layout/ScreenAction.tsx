import { cn } from '@/lib/utils';

interface ScreenActionProps {
  children: React.ReactNode;
  className?: string;
  /**
   * When true, the bar is rendered fixed inside the bottom-tab AppShell — i.e.
   * sits above the tab bar (60px). When false, it sits at the bottom of the
   * viewport (no tab bar present, e.g. login / org-select).
   */
  aboveTabBar?: boolean;
}

export function ScreenAction({
  children,
  className,
  aboveTabBar = true,
}: ScreenActionProps): React.ReactElement {
  return (
    <div
      className={cn(
        'fixed inset-x-0 z-30 screen-action-overlay px-4 pt-6 pb-[max(env(safe-area-inset-bottom),16px)]',
        aboveTabBar ? 'bottom-[60px]' : 'bottom-0',
        className,
      )}
    >
      <div className="mx-auto flex max-w-screen-md flex-col gap-2">
        {children}
      </div>
    </div>
  );
}
