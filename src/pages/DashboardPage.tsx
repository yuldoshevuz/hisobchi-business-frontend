import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Archive,
  BarChart3,
  Building2,
  CalendarClock,
  Coins,
  Contact,
  Eye,
  EyeOff,
  ListChecks,
  Package,
  Plus,
  ShoppingCart,
  Star,
  Users,
} from 'lucide-react';
import { useCurrentOrganization } from '@/api/hooks/use-organizations';
import { useAccounts } from '@/api/hooks/use-accounts';
import { useLimitGuard } from '@/api/hooks/use-subscription';
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
import { ReminderHighlights } from '@/components/scheduled/ReminderHighlights';
import { DebtRemindersHighlights } from '@/components/transactions/DebtRemindersHighlights';
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
import {
  DASHBOARD_USE_CASES,
  TRANSACTION_USE_CASES,
  type TransactionUseCase,
} from '@/lib/transaction-use-cases';
import { cn } from '@/lib/utils';
import type { Account } from '@/types/account.types';

const HIDDEN_BALANCE_PLACEHOLDER = '••••••';

export function DashboardPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const org = useCurrentOrganization();
  const me = useMe();

  // Deep-link entry point: `useDeepLink` (mounted in AppShell) parses the
  // bot's start_param and navigates here with `?reminderId=<n>`. We forward
  // that into <ReminderHighlights/> which auto-opens the modal once the data
  // lands. After consumption we strip the param so a refresh doesn't keep
  // re-popping the same modal.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawReminderId = searchParams.get('reminderId');
  const selectedReminderId = useMemo(() => {
    if (!rawReminderId) return null;
    const n = Number(rawReminderId);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [rawReminderId]);
  const handleReminderConsumed = useCallback(() => {
    if (!searchParams.has('reminderId')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('reminderId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  function handleSwitchOrg(): void {
    tgHapticImpact('light');
    tokenStore.setActiveOrgId(null);
    navigate('/organizations');
  }

  return (
    <div>
      <PageHeader
        title={org.data?.name ?? t('dashboard.default_title')}
        description={
          me.data
            ? t('dashboard.greeting', { name: me.data.fullName })
            : undefined
        }
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

        <Can slug={PermissionSlug.SCHEDULED_READ}>
          <ReminderHighlights
            selectedReminderId={selectedReminderId}
            onSelectionConsumed={handleReminderConsumed}
          />
        </Can>

        <Can slug={PermissionSlug.TRANSACTIONS_READ}>
          <DebtRemindersHighlights />
        </Can>

        {org.data ? <ViewerRoleBadges roleNames={org.data.viewer.roleNames} /> : null}

        <Can slug={PermissionSlug.TRANSACTIONS_CREATE}>
          <TransactionTypesGrid />
        </Can>

        <Section title={t('dashboard.quick_actions')}>
          <Can slug={PermissionSlug.TRANSACTIONS_READ}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-help-success-16)] text-[var(--color-help-success)]">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              }
              title={t('dashboard.sales')}
              subtitle={t('dashboard.sales_subtitle')}
              showChevron
              onClick={() => navigate('/sales')}
            />
          </Can>
          <Can slug={PermissionSlug.TRANSACTIONS_READ}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ListChecks className="h-4 w-4" />
                </div>
              }
              title={t('dashboard.transactions')}
              subtitle={t('dashboard.transactions_subtitle')}
              showChevron
              onClick={() => navigate('/transactions')}
            />
          </Can>
          <Can slug={PermissionSlug.CONTACTS_READ}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Contact className="h-4 w-4" />
                </div>
              }
              title={t('dashboard.contacts')}
              subtitle={t('dashboard.contacts_subtitle')}
              showChevron
              onClick={() => navigate('/contacts')}
            />
          </Can>
          <Can slug={PermissionSlug.PRODUCTS_READ}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="h-4 w-4" />
                </div>
              }
              title={t('dashboard.catalog')}
              subtitle={t('dashboard.catalog_subtitle')}
              showChevron
              onClick={() => navigate('/katalog')}
            />
          </Can>
          <Can slug={PermissionSlug.SCHEDULED_READ}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarClock className="h-4 w-4" />
                </div>
              }
              title={t('dashboard.scheduled')}
              subtitle={t('dashboard.scheduled_subtitle')}
              showChevron
              onClick={() => navigate('/scheduled')}
            />
          </Can>
          <Can slug={PermissionSlug.COMMISSIONS_READ}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Coins className="h-4 w-4" />
                </div>
              }
              title={t('dashboard.commissions')}
              subtitle={t('dashboard.commissions_subtitle')}
              showChevron
              onClick={() => navigate('/commissions')}
            />
          </Can>
          <Can slug={PermissionSlug.REPORTS_READ}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="h-4 w-4" />
                </div>
              }
              title={t('dashboard.reports')}
              subtitle={t('dashboard.reports_subtitle')}
              showChevron
              onClick={() => navigate('/reports')}
            />
          </Can>
          <Can slug={PermissionSlug.MEMBERS_MANAGE}>
            <ListItem
              leading={
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
              }
              title={t('dashboard.settings')}
              subtitle={t('dashboard.settings_subtitle')}
              showChevron
              onClick={() => navigate('/sozlamalar')}
            />
          </Can>
        </Section>
      </div>
    </div>
  );
}

/**
 * Five business actions on the dashboard. Each card opens a creation page
 * tailored to that action — there is no generic "add transaction" surface.
 */
function TransactionTypesGrid(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function open(slug: TransactionUseCase): void {
    tgHapticImpact('light');
    navigate(`/transactions/new/${slug}`);
  }

  return (
    <section className="px-4">
      <div className="px-1 pb-1.5 pt-4 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
        {t('dashboard.new_transaction')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {DASHBOARD_USE_CASES.map((slug) => {
          const meta = TRANSACTION_USE_CASES[slug];
          const Icon = meta.icon;
          return (
            <button
              key={slug}
              type="button"
              onClick={() => open(slug)}
              className="press flex items-start gap-3 rounded-2xl bg-card p-3 text-left active:bg-accent"
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  meta.sign === 'positive' &&
                    'bg-[var(--color-help-success-16)] text-[var(--color-help-success)]',
                  meta.sign === 'negative' &&
                    'bg-destructive/10 text-destructive',
                  meta.sign === 'neutral' && 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium leading-tight">
                  {t(meta.labelKey)}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {t(meta.descriptionKey)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AccountsOverview(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canManage = useCan(PermissionSlug.ACCOUNTS_MANAGE);
  const accounts = useAccounts({ includeArchived: true });
  // Live count for ACCOUNT_LIMIT — only "active" accounts count toward
  // the cap. Archived accounts don't, matching backend's
  // `Account.count(orgId, deletedAt = null)` heuristic.
  const accountGuard = useLimitGuard(
    'ACCOUNT_LIMIT',
    (accounts.data ?? []).length,
  );
  const [hidden, setHidden] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);
  const [actionAccount, setActionAccount] = useState<Account | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);

  const { active, archived } = useMemo(() => {
    const list = accounts.data ?? [];
    return {
      active: list.filter((a) => a.status === 'active'),
      archived: list.filter((a) => a.status === 'archived'),
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
    if (!accountGuard.canCreate) {
      navigate('/plans');
      return;
    }
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
              {t('dashboard.total_balance')}
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
            aria-label={
              hidden
                ? t('dashboard.show_balances')
                : t('dashboard.hide_balances')
            }
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
              aria-label={
                accountGuard.canCreate
                  ? t('dashboard.add_account')
                  : t('dashboard.plan_limit_reached')
              }
              title={
                accountGuard.canCreate
                  ? `${t('dashboard.add_account')} (${accountGuard.label})`
                  : `${t('dashboard.plan_limit_reached')}: ${accountGuard.label}`
              }
              className={cn(
                'press flex h-[88px] w-14 shrink-0 items-center justify-center rounded-2xl',
                accountGuard.canCreate
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-amber-100 text-amber-700',
              )}
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
                    <span>{t('dashboard.archive_title')}</span>
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
        title={t('dashboard.new_account_title')}
        description={t('dashboard.new_account_description')}
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
        title={t('dashboard.edit_account_title')}
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
        title={t('dashboard.archive_title')}
        description={t('dashboard.archived_count', { count: archived.length })}
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
            {t('dashboard.archive_empty')}
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
  const { t } = useTranslation();
  const Icon = ACCOUNT_TYPE_ICON[account.type];
  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        'press relative flex h-[88px] w-[160px] shrink-0 flex-col justify-between rounded-2xl bg-muted p-3 text-left',
        account.isPrimary && 'ring-1 ring-primary/40',
      )}
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
      {account.isPrimary ? (
        <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-primary">
          <Star className="h-2.5 w-2.5 fill-current" />
          <span>{t('dashboard.primary_badge')}</span>
        </div>
      ) : null}
    </button>
  );
}

interface ViewerRoleBadgesProps {
  roleNames: string[];
}

function ViewerRoleBadges({
  roleNames,
}: ViewerRoleBadgesProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (roleNames.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4">
      <span className="text-[12px] uppercase tracking-wide text-muted-foreground">
        {t('dashboard.your_roles')}
      </span>
      {roleNames.map((name) => (
        <Badge key={name} variant="secondary" className="text-[11px]">
          {name}
        </Badge>
      ))}
    </div>
  );
}
