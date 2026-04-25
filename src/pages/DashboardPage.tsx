import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Building2,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useCurrentOrganization } from '@/api/hooks/use-organizations';
import { useMe } from '@/api/hooks/use-user';
import { PageHeader } from '@/components/layout/PageHeader';
import { Can } from '@/components/Can';
import { ListItem, Section } from '@/components/ui/list-item';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { tokenStore } from '@/store/token-store';
import { getApiErrorMessage } from '@/lib/api-error';
import { PermissionSlug } from '@/lib/permission-slugs';
import { tgHapticImpact } from '@/lib/telegram';

export function DashboardPage(): React.ReactElement {
  const navigate = useNavigate();
  const org = useCurrentOrganization();
  const me = useMe();

  function handleSwitchOrg(): void {
    tgHapticImpact('light');
    tokenStore.setActiveOrgId(null);
    navigate('/organizations');
  }

  return (
    <div>
      <PageHeader
        title={org.data?.name ?? 'Asosiy'}
        description={me.data ? `Salom, ${me.data.fullName}` : undefined}
        large
        action={
          <Button variant="ghost" size="icon" onClick={handleSwitchOrg}>
            <Building2 className="h-5 w-5" />
          </Button>
        }
      />

      <div className="space-y-3">
        {org.isPending ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        ) : org.isError ? (
          <Section>
            <ListItem
              asStatic
              title={
                <span className="text-destructive">
                  {getApiErrorMessage(org.error)}
                </span>
              }
            />
          </Section>
        ) : null}

        <div className="grid grid-cols-2 gap-3 px-4">
          <StatTile
            icon={Wallet}
            label="Valyuta"
            value={org.data?.baseCurrency ?? '—'}
          />
          <StatTile
            icon={Building2}
            label="Status"
            value={org.data?.status ?? '—'}
          />
        </div>

        {org.data ? <ViewerRoleBadges roleNames={org.data.viewer.roleNames} /> : null}

        <Section title="Tezkor amallar">
          <Can slug={PermissionSlug.MEMBERS_MANAGE}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
              }
              title="A'zolar"
              subtitle="Tashkilot a'zolari va rollari"
              showChevron
              onClick={() => navigate('/members')}
            />
          </Can>
          <Can slug={PermissionSlug.ROLES_MANAGE}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              }
              title="Rollar"
              subtitle="Rollar va ruxsatlarni boshqarish"
              showChevron
              onClick={() => navigate('/roles')}
            />
          </Can>
          <Can slug={PermissionSlug.TRANSACTIONS_READ}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <ArrowLeftRight className="h-4 w-4" />
                </div>
              }
              title="Tranzaksiyalar"
              subtitle="Tez orada"
              asStatic
            />
          </Can>
        </Section>
      </div>
    </div>
  );
}

interface ViewerRoleBadgesProps {
  roleNames: string[];
}

function ViewerRoleBadges({
  roleNames,
}: ViewerRoleBadgesProps): React.ReactElement | null {
  if (roleNames.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4">
      <span className="text-[12px] uppercase tracking-wide text-muted-foreground">
        Sizning rollaringiz
      </span>
      {roleNames.map((name) => (
        <Badge key={name} variant="secondary" className="text-[11px]">
          {name}
        </Badge>
      ))}
    </div>
  );
}

interface StatTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function StatTile({
  icon: Icon,
  label,
  value,
}: StatTileProps): React.ReactElement {
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-[12px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 truncate text-[17px] font-semibold capitalize">
        {value}
      </div>
    </div>
  );
}
