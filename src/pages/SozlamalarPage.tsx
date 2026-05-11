import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { MembersPage } from './MembersPage';
import { OrganizationSettingsPage } from './OrganizationSettingsPage';
import { RolesPage } from './RolesPage';
import { cn } from '@/lib/utils';
import { tgHapticSelection } from '@/lib/telegram';

type SozlamalarTab = 'members' | 'roles' | 'organization';

const TABS: ReadonlyArray<{ id: SozlamalarTab; label: string }> = [
  { id: 'members', label: 'Xodimlar' },
  { id: 'roles', label: 'Rollar' },
  { id: 'organization', label: 'Tashkilot' },
];

function readTab(value: string | null): SozlamalarTab {
  if (value === 'roles') return 'roles';
  if (value === 'organization') return 'organization';
  return 'members';
}

export function SozlamalarPage(): React.ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get('tab'));

  function selectTab(next: SozlamalarTab): void {
    if (next === tab) return;
    tgHapticSelection();
    const params = new URLSearchParams(searchParams);
    if (next === 'members') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  }

  return (
    <div>
      <PageHeader
        title="Sozlamalar"
        description="Xodimlar va rollar"
        large
      />

      <div className="px-4 pb-3">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={cn(
                  'press flex-1 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors',
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'members' ? (
        <MembersPage embedded />
      ) : tab === 'roles' ? (
        <RolesPage embedded />
      ) : (
        <OrganizationSettingsPage />
      )}
    </div>
  );
}
