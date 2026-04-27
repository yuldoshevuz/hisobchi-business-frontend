import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  ArrowLeftRight,
  Building2,
  Eye,
  EyeOff,
  FolderTree,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useCurrentOrganization } from '@/api/hooks/use-organizations';
import { useAccounts } from '@/api/hooks/use-accounts';
import { useMe } from '@/api/hooks/use-user';
import { PageHeader } from '@/components/layout/PageHeader';
import { Can } from '@/components/Can';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { AccountActions } from '@/components/accounts/AccountActions';
import { CreateAccountForm } from '@/components/accounts/CreateAccountForm';
import { EditAccountForm } from '@/components/accounts/EditAccountForm';
import {
  ACCOUNT_TYPE_ICON,
  ACCOUNT_TYPE_LABEL,
} from '@/components/accounts/account-meta';
import { useCan } from '@/hooks/use-permissions';
import { tokenStore } from '@/store/token-store';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { PermissionSlug } from '@/lib/permission-slugs';
import { tgHapticImpact } from '@/lib/telegram';
import type { Account } from '@/types/account.types';

const HIDDEN_BALANCE_PLACEHOLDER = '••••••';

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

        <Can slug={PermissionSlug.ACCOUNTS_READ}>
          <AccountsOverview />
        </Can>

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
          <Can slug={PermissionSlug.CATEGORIES_MANAGE}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderTree className="h-4 w-4" />
                </div>
              }
              title="Kategoriyalar"
              subtitle="Chiqim, kirim va mahsulot turlari"
              showChevron
              onClick={() => navigate('/categories')}
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

function AccountsOverview(): React.ReactElement {
  const canManage = useCan(PermissionSlug.ACCOUNTS_MANAGE);
  const accounts = useAccounts({ includeArchived: true });
  const [hidden, setHidden] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);
  const [actionAccount, setActionAccount] = useState<Account | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);

  const { active, archived } = useMemo(() => {
    const list = accounts.data ?? [];
    return {
      active: list.filter((a) => a.status === 'ACTIVE'),
      archived: list.filter((a) => a.status === 'ARCHIVED'),
    };
  }, [accounts.data]);

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of active) {
      const numeric = Number(a.currentBalance);
      if (!Number.isFinite(numeric)) continue;
      map.set(a.currency, (map.get(a.currency) ?? 0) + numeric);
    }
    return Array.from(map.entries());
  }, [active]);

  function openCreate(): void {
    if (!canManage) return;
    tgHapticImpact('light');
    setCreateOpen(true);
  }

  function openActions(account: Account): void {
    tgHapticImpact('light');
    if (canManage) setActionAccount(account);
  }

  function toggleHidden(): void {
    tgHapticImpact('light');
    setHidden((v) => !v);
  }

  return (
    <>
      <div className="mx-4 rounded-2xl bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-muted-foreground">
              Umumiy balans
            </div>
            {accounts.isPending ? (
              <div className="mt-2">
                <Spinner className="h-5 w-5" />
              </div>
            ) : totals.length > 0 ? (
              <div className="mt-1 space-y-0.5">
                {totals.map(([currency, sum]) => (
                  <div key={currency} className="flex items-baseline gap-1.5">
                    <span className="truncate text-[26px] font-bold leading-tight tabular-nums">
                      {hidden ? HIDDEN_BALANCE_PLACEHOLDER : formatMoney(sum)}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {currency}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-1 text-[20px] font-semibold text-muted-foreground">
                0
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleHidden}
            className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground"
            aria-label={hidden ? "Balansni ko'rsatish" : 'Balansni yashirish'}
          >
            {hidden ? (
              <Eye className="h-5 w-5" />
            ) : (
              <EyeOff className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {canManage ? (
            <button
              type="button"
              onClick={openCreate}
              aria-label="Yangi hisob qo'shish"
              className="press flex h-[88px] w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
            >
              <Plus className="h-6 w-6" />
            </button>
          ) : null}
          {accounts.isPending ? (
            <div className="flex h-[88px] flex-1 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <>
              {active.map((a) => (
                <AccountChip
                  key={a.id}
                  account={a}
                  hidden={hidden}
                  onTap={() => openActions(a)}
                />
              ))}
              {archived.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    tgHapticImpact('light');
                    setArchiveOpen(true);
                  }}
                  className="press flex h-[88px] w-[120px] shrink-0 flex-col items-start justify-between rounded-2xl border border-dashed border-border bg-transparent p-3 text-left text-muted-foreground"
                >
                  <div className="flex items-center gap-1.5 text-[12px]">
                    <Archive className="h-3.5 w-3.5 shrink-0" />
                    <span>Arxiv</span>
                  </div>
                  <div className="text-[15px] font-semibold tabular-nums text-foreground">
                    {archived.length}
                  </div>
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Yangi hisob"
        description="Kassa, bank, hamyon yoki karta"
      >
        <CreateAccountForm onClose={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={Boolean(actionAccount)}
        onOpenChange={(o) => {
          if (!o) setActionAccount(null);
        }}
        title={actionAccount?.name}
        description={
          actionAccount
            ? `${ACCOUNT_TYPE_LABEL[actionAccount.type]} · ${formatMoney(
                actionAccount.currentBalance,
                actionAccount.currency,
              )}`
            : undefined
        }
      >
        {actionAccount ? (
          <AccountActions
            account={actionAccount}
            onClose={() => setActionAccount(null)}
            onEdit={() => {
              setEditing(actionAccount);
              setActionAccount(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title="Hisobni tahrirlash"
        description={editing ? ACCOUNT_TYPE_LABEL[editing.type] : undefined}
      >
        {editing ? (
          <EditAccountForm
            account={editing}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Arxiv"
        description={`${archived.length} ta arxivlangan hisob`}
      >
        {archived.length > 0 ? (
          <div className="-mx-4 divide-y divide-border bg-card">
            {archived.map((a) => {
              const Icon = ACCOUNT_TYPE_ICON[a.type];
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    tgHapticImpact('light');
                    setArchiveOpen(false);
                    if (canManage) setActionAccount(a);
                  }}
                  className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">
                      {a.name}
                    </div>
                    <div className="text-[13px] text-muted-foreground">
                      {ACCOUNT_TYPE_LABEL[a.type]}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[15px] font-semibold tabular-nums">
                      {hidden
                        ? HIDDEN_BALANCE_PLACEHOLDER
                        : formatMoney(a.currentBalance)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {a.currency}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-[14px] text-muted-foreground">
            Arxivlangan hisoblar yo'q
          </div>
        )}
      </Modal>
    </>
  );
}

interface AccountChipProps {
  account: Account;
  hidden: boolean;
  onTap: () => void;
}

function AccountChip({
  account,
  hidden,
  onTap,
}: AccountChipProps): React.ReactElement {
  const Icon = ACCOUNT_TYPE_ICON[account.type];
  return (
    <button
      type="button"
      onClick={onTap}
      className="press flex h-[88px] w-[160px] shrink-0 flex-col justify-between rounded-2xl bg-muted p-3 text-left"
    >
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{account.name}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="truncate text-[15px] font-semibold tabular-nums">
          {hidden ? HIDDEN_BALANCE_PLACEHOLDER : formatMoney(account.currentBalance)}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {account.currency}
        </span>
      </div>
    </button>
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
