import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { MembersPage } from './MembersPage';
import { OrganizationSettingsPage } from './OrganizationSettingsPage';
import { RolesPage } from './RolesPage';
import { cn } from '@/lib/utils';
import { tgHapticSelection } from '@/lib/telegram';

type SozlamalarTab = 'members' | 'roles' | 'organization';

const TABS: ReadonlyArray<{ id: SozlamalarTab; labelKey: string }> = [
  { id: 'members', labelKey: 'settings.members' },
  { id: 'roles', labelKey: 'settings.roles' },
  { id: 'organization', labelKey: 'settings.organization' },
];

function readTab(value: string | null): SozlamalarTab {
  if (value === 'roles') return 'roles';
  if (value === 'organization') return 'organization';
  return 'members';
}

export function SozlamalarPage(): React.ReactElement {
  const { t } = useTranslation();
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
        title={t('dashboard.settings')}
        description={t('dashboard.settings_subtitle')}
        large
      />

      <div className="px-4 pb-3">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {TABS.map((tab_) => {
            const active = tab_.id === tab;
            return (
              <button
                key={tab_.id}
                type="button"
                onClick={() => selectTab(tab_.id)}
                className={cn(
                  'press flex-1 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors',
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground',
                )}
              >
                {t(tab_.labelKey)}
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
