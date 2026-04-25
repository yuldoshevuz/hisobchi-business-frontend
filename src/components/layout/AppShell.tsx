import { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tgHapticSelection } from '@/lib/telegram';
import { usePermissions } from '@/hooks/use-permissions';
import { PermissionSlug } from '@/lib/permission-slugs';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Permission slugs required to show this tab. Empty = always shown. */
  requireAny?: PermissionSlug[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Asosiy', icon: LayoutDashboard },
  {
    to: '/members',
    label: "A'zolar",
    icon: Users,
    requireAny: [PermissionSlug.MEMBERS_MANAGE],
  },
  {
    to: '/roles',
    label: 'Rollar',
    icon: ShieldCheck,
    requireAny: [PermissionSlug.ROLES_MANAGE],
  },
  { to: '/profile', label: 'Profil', icon: UserIcon },
];

export function AppShell(): React.ReactElement {
  const { isReady, hasAny } = usePermissions();

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (!item.requireAny || item.requireAny.length === 0) return true;
      // Hide gated tabs until permissions are loaded — avoids flicker.
      if (!isReady) return false;
      return hasAny(...item.requireAny);
    });
  }, [isReady, hasAny]);

  // Tailwind grid-cols-N must be statically known; pick from a fixed set.
  const colsClass =
    visibleItems.length >= 4
      ? 'grid-cols-4'
      : visibleItems.length === 3
        ? 'grid-cols-3'
        : visibleItems.length === 2
          ? 'grid-cols-2'
          : 'grid-cols-1';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+72px)]">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card safe-bottom">
        <ul className={cn('mx-auto grid max-w-screen-md', colsClass)}>
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={() => tgHapticSelection()}
                className={({ isActive }) =>
                  cn(
                    'press flex h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
