import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  Clock,
  MoreHorizontal,
  Pause,
  Pencil,
  Phone as PhoneIcon,
  Play,
  Send,
  TrendingUp,
  Wallet,
  Percent,
} from 'lucide-react';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { useRoles } from '@/api/hooks/use-rbac';
import {
  useMemberProfile,
  useRemoveMember,
  useUpdateMemberStatus,
} from '@/api/hooks/use-members';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { PermissionSlug } from '@/lib/permission-slugs';
import { cn } from '@/lib/utils';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import type {
  MemberActivityRow,
  MemberAmountByCurrency,
  MemberCommissionRow,
  MemberProfile,
} from '@/types/member.types';
import type { Role } from '@/types/rbac.types';

// Local reuse — duplicated here on purpose because the page is the only
// consumer and MembersPage may move to a different layout later without
// dragging it along.
function computeInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function MemberDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const memberId = useMemo(() => {
    const n = Number(params.id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params.id]);

  const { isReady } = usePermissions();
  const canManage = useCan(PermissionSlug.MEMBERS_MANAGE);

  const profileQuery = useMemberProfile(memberId, { enabled: canManage });
  const rolesQuery = useRoles({ enabled: canManage });

  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);

  if (isReady && !canManage) {
    return (
      <AccessDeniedView
        title={t('members.title')}
        description={t('members.no_access')}
        hint="members.manage"
      />
    );
  }

  if (memberId === null) {
    return (
      <div className="px-6 py-12 text-center text-[14px] text-muted-foreground">
        {t('members.detail.invalid_id')}
      </div>
    );
  }

  if (profileQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-[14px] text-destructive">
          {profileQuery.error
            ? getApiErrorMessage(profileQuery.error)
            : t('members.detail.load_failed')}
        </p>
      </div>
    );
  }

  const profile = profileQuery.data;
  const m = profile.member;

  return (
    <div className="pb-16">
      <PageHeader
        title={m.name}
        description={m.phone ?? t('members.row.no_phone')}
        showBack
        action={
          <button
            type="button"
            aria-label="actions"
            onClick={() => {
              tgHapticImpact('light');
              setActionsOpen(true);
            }}
            className="press rounded-md p-1.5 text-muted-foreground active:bg-accent"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        }
      />

      <IdentityCard profile={profile} />

      <KpiCards profile={profile} />

      <ActivitySection
        title={t('members.detail.sales_section')}
        emptyHint={t('members.detail.sales_empty')}
        rows={profile.recentSales}
        onTapRow={(row) => navigate(`/transactions/${row.id}`)}
        viewAllHref={
          m.user?.id
            ? `/transactions?type=sale&createdBy=${m.user.id}`
            : `/commissions?memberId=${m.id}`
        }
        showCount={profile.stats.salesCount}
      />

      <CommissionsSection
        rows={profile.recentCommissions}
        onTapRow={(row) => navigate(`/transactions/${row.saleId}`)}
        viewAllHref={`/commissions?memberId=${m.id}`}
        totalCount={profile.stats.commissionCount}
      />

      <ActivitySection
        title={t('members.detail.salaries_section')}
        emptyHint={t('members.detail.salaries_empty')}
        rows={profile.recentSalaries}
        onTapRow={(row) => navigate(`/transactions/${row.id}`)}
        viewAllHref={`/transactions?type=expense&memberId=${m.id}`}
        showCount={profile.stats.salaryCount}
      />

      {/* Actions sheet — owner / manage menu */}
      <Modal
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        title={m.name}
        description={m.phone ?? undefined}
      >
        <ActionSheet
          memberId={m.id}
          isSuspended={m.status === 'suspended'}
          onEdit={() => {
            setActionsOpen(false);
            setEditOpen(true);
          }}
          onClose={() => setActionsOpen(false)}
          onArchived={() => {
            setActionsOpen(false);
            navigate(-1);
          }}
        />
      </Modal>

      {/* Edit sheet — defer to the same form MembersPage uses */}
      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        title={t('members.edit.title')}
        description={m.name}
      >
        {editOpen ? (
          <EditEmployeeFormSlot
            member={m}
            roles={rolesQuery.data ?? []}
            rolesLoading={rolesQuery.isPending}
            onClose={() => setEditOpen(false)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

// ─── Identity card ──────────────────────────────────────────────────────

function IdentityCard({
  profile,
}: {
  profile: MemberProfile;
}): React.ReactElement {
  const { t } = useTranslation();
  const m = profile.member;
  const isPending = m.user === null;
  const isSuspended = m.status === 'suspended';
  const tgLinked = m.user?.telegramId != null;
  const linkedNameDiffers =
    m.user !== null && m.user.fullName !== m.name;

  return (
    <Section>
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="relative">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-[15px]">
              {computeInitials(m.name) || '?'}
            </AvatarFallback>
          </Avatar>
          <span
            aria-hidden
            className={cn(
              'absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-card',
              isPending
                ? 'bg-amber-400'
                : isSuspended
                  ? 'bg-muted-foreground'
                  : 'bg-[var(--color-help-success)]',
            )}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[16px] font-semibold text-foreground">
              {m.name}
            </span>
            {isPending ? (
              <Badge
                variant="outline"
                className="border-amber-300 text-[10px] text-amber-700"
              >
                {t('members.badge.pending')}
              </Badge>
            ) : null}
            {isSuspended ? (
              <Badge variant="destructive" className="text-[10px]">
                {t('members.badge.suspended')}
              </Badge>
            ) : null}
            {tgLinked ? (
              <Send
                aria-label={t('members.badge.tg_linked')}
                className="h-3.5 w-3.5 text-sky-500"
              />
            ) : null}
          </div>
          <div className="text-[13px] text-muted-foreground">
            {m.phone ? (
              <span className="inline-flex items-center gap-1">
                <PhoneIcon className="h-3 w-3" />
                {m.phone}
              </span>
            ) : (
              <span>{t('members.row.no_phone')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Original user / linked account row */}
      {m.user ? (
        <div className="flex flex-col gap-1 px-4 py-3 text-[13px] text-muted-foreground">
          {linkedNameDiffers ? (
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              <span>
                {t('members.detail.account_name')}:&nbsp;
                <span className="font-medium text-foreground">
                  {m.user.fullName}
                </span>
              </span>
            </div>
          ) : null}
          {m.user.phoneNumber && m.user.phoneNumber !== m.phone ? (
            <div className="flex items-center gap-2">
              <PhoneIcon className="h-3.5 w-3.5" />
              <span>
                {t('members.detail.account_phone')}:&nbsp;
                <span className="font-medium text-foreground">
                  {m.user.phoneNumber}
                </span>
              </span>
            </div>
          ) : null}
          {tgLinked ? (
            <div className="flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-sky-500" />
              <span className="text-foreground">
                {t('members.detail.tg_id', { id: m.user.telegramId })}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 text-[13px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>{t('members.detail.pending_hint')}</span>
        </div>
      )}

      {/* Defaults */}
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card px-4 py-3">
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground">
            {t('members.row.salary_label')}
          </div>
          <div className="mt-1 text-[14px] font-medium">
            {m.defaultSalaryAmount
              ? formatMoney(
                  m.defaultSalaryAmount,
                  m.defaultSalaryCurrency ?? undefined,
                )
              : '—'}
          </div>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground">
            {t('members.row.commission_label')}
          </div>
          <div className="mt-1 text-[14px] font-medium">
            {m.defaultCommissionPercentage
              ? `${m.defaultCommissionPercentage}%`
              : '—'}
          </div>
        </div>
      </div>

      {/* Roles */}
      {m.roles.length > 0 ? (
        <div className="flex flex-wrap gap-1 px-4 py-3">
          {m.roles.map((r) => (
            <Badge key={r.id} variant="secondary" className="text-[11px]">
              {r.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

// ─── KPI cards ──────────────────────────────────────────────────────────

function KpiCards({
  profile,
}: {
  profile: MemberProfile;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-2 px-4 pt-3">
      <KpiCard
        icon={<Percent className="h-4 w-4" />}
        label={t('edit_employee.summary.commission_earned')}
        amounts={profile.summary.commissionsEarned}
        count={profile.stats.commissionCount}
        accent="success"
      />
      <KpiCard
        icon={<Wallet className="h-4 w-4" />}
        label={t('edit_employee.summary.salary_paid')}
        amounts={profile.summary.salaryPaid}
        count={profile.stats.salaryCount}
        accent="warning"
      />
      <KpiCard
        icon={<TrendingUp className="h-4 w-4" />}
        label={t('members.detail.sales_total')}
        amounts={profile.stats.salesTotals}
        count={profile.stats.salesCount}
        accent="info"
      />
      <KpiCard
        icon={<Clock className="h-4 w-4" />}
        label={t('members.detail.sales_outstanding')}
        amounts={profile.stats.salesOutstanding}
        accent={
          profile.stats.salesOutstanding.some((r) => Number(r.total) > 0)
            ? 'danger'
            : 'muted'
        }
      />
    </div>
  );
}

type KpiAccent = 'success' | 'warning' | 'info' | 'danger' | 'muted';

const KPI_ACCENT_TINT: Record<KpiAccent, string> = {
  success: 'bg-emerald-500/10 text-emerald-700',
  warning: 'bg-amber-500/10 text-amber-700',
  info: 'bg-sky-500/10 text-sky-700',
  danger: 'bg-rose-500/10 text-rose-700',
  muted: 'bg-muted text-muted-foreground',
};

function KpiCard({
  icon,
  label,
  amounts,
  count,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  amounts: MemberAmountByCurrency[];
  count?: number;
  accent: KpiAccent;
}): React.ReactElement {
  const hasData = amounts.length > 0;
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-lg',
            KPI_ACCENT_TINT[accent],
          )}
        >
          {icon}
        </span>
        {count !== undefined && count > 0 ? (
          <span className="text-[11px] font-medium text-muted-foreground">
            ×{count}
          </span>
        ) : null}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="space-y-0.5">
        {hasData ? (
          amounts.map((a) => (
            <div
              key={a.currency}
              className="text-[14px] font-semibold tabular-nums text-foreground"
            >
              {formatMoney(a.total, a.currency)}
            </div>
          ))
        ) : (
          <div className="text-[14px] font-medium text-muted-foreground">
            —
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity / commission sections ─────────────────────────────────────

function ActivitySection({
  title,
  emptyHint,
  rows,
  onTapRow,
  viewAllHref,
  showCount,
}: {
  title: string;
  emptyHint: string;
  rows: MemberActivityRow[];
  onTapRow: (row: MemberActivityRow) => void;
  viewAllHref?: string;
  showCount?: number;
}): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="pt-4">
      <div className="flex items-center justify-between px-5 pb-1.5">
        <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {showCount !== undefined && showCount > 0 ? (
          <span className="text-[11px] text-muted-foreground">
            {t('members.detail.total_count', { count: showCount })}
          </span>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <Section>
          <ListItem
            asStatic
            title={
              <span className="text-[13px] text-muted-foreground">
                {emptyHint}
              </span>
            }
          />
        </Section>
      ) : (
        <Section>
          {rows.map((r) => (
            <ActivityRow
              key={`${r.id}-${r.type}`}
              row={r}
              onTap={() => {
                tgHapticImpact('light');
                onTapRow(r);
              }}
            />
          ))}
          {viewAllHref && showCount !== undefined && showCount > rows.length ? (
            <ListItem
              onClick={() => navigate(viewAllHref)}
              title={
                <span className="text-[13px] font-medium text-primary">
                  {t('members.detail.view_all')}
                </span>
              }
              trailing={<ArrowRight className="h-4 w-4 text-primary" />}
            />
          ) : null}
        </Section>
      )}
    </div>
  );
}

function ActivityRow({
  row,
  onTap,
}: {
  row: MemberActivityRow;
  onTap: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const isUnpaid =
    row.paymentStatus === 'unpaid' || row.paymentStatus === 'partial';
  return (
    <ListItem
      onClick={onTap}
      showChevron
      title={
        <span className="flex items-center justify-between gap-2">
          <span className="truncate">
            {row.contactName ?? row.description ?? `#${row.id}`}
          </span>
          <span className="shrink-0 tabular-nums text-[14px] font-semibold">
            {formatMoney(row.amount, row.currency)}
          </span>
        </span>
      }
      subtitle={
        <span className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted-foreground">{row.date}</span>
          {isUnpaid ? (
            <Badge
              variant="outline"
              className="border-amber-300 text-[10px] text-amber-700"
            >
              {t('members.detail.payment_unpaid', {
                amount: formatMoney(
                  String(Number(row.amount) - Number(row.paidAmount)),
                  row.currency,
                ),
              })}
            </Badge>
          ) : null}
        </span>
      }
    />
  );
}

function CommissionsSection({
  rows,
  onTapRow,
  viewAllHref,
  totalCount,
}: {
  rows: MemberCommissionRow[];
  onTapRow: (row: MemberCommissionRow) => void;
  viewAllHref: string;
  totalCount: number;
}): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="pt-4">
      <div className="flex items-center justify-between px-5 pb-1.5">
        <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('members.detail.commissions_section')}
        </span>
        {totalCount > 0 ? (
          <span className="text-[11px] text-muted-foreground">
            {t('members.detail.total_count', { count: totalCount })}
          </span>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <Section>
          <ListItem
            asStatic
            title={
              <span className="text-[13px] text-muted-foreground">
                {t('members.detail.commissions_empty')}
              </span>
            }
          />
        </Section>
      ) : (
        <Section>
          {rows.map((r) => (
            <ListItem
              key={r.id}
              onClick={() => {
                tgHapticImpact('light');
                onTapRow(r);
              }}
              showChevron
              leading={
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
                  <Percent className="h-4 w-4" />
                </div>
              }
              title={
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {t('members.detail.commission_for_sale', {
                      saleId: r.saleId,
                    })}
                  </span>
                  <span className="shrink-0 tabular-nums text-[14px] font-semibold">
                    {formatMoney(r.amount, r.currency)}
                  </span>
                </span>
              }
              subtitle={
                <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span>
                    {new Date(r.createdAt).toISOString().slice(0, 10)}
                  </span>
                  {r.percentage ? <span>· {r.percentage}%</span> : null}
                </span>
              }
            />
          ))}
          {totalCount > rows.length ? (
            <ListItem
              onClick={() => navigate(viewAllHref)}
              title={
                <span className="text-[13px] font-medium text-primary">
                  {t('members.detail.view_all')}
                </span>
              }
              trailing={<ArrowRight className="h-4 w-4 text-primary" />}
            />
          ) : null}
        </Section>
      )}
    </div>
  );
}

// ─── Action sheet ───────────────────────────────────────────────────────

function ActionSheet({
  memberId,
  isSuspended,
  onEdit,
  onClose,
  onArchived,
}: {
  memberId: number;
  isSuspended: boolean;
  onEdit: () => void;
  onClose: () => void;
  onArchived: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const updateStatus = useUpdateMemberStatus();
  const remove = useRemoveMember();

  function toggleStatus(): void {
    tgHapticImpact('medium');
    updateStatus.mutate(
      {
        id: memberId,
        body: { status: isSuspended ? 'active' : 'suspended' },
      },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }

  function handleArchive(): void {
    if (!confirm(t('members.detail.archive_confirm'))) return;
    tgHapticImpact('heavy');
    remove.mutate(memberId, {
      onSuccess: () => {
        tgHapticNotify('success');
        onArchived();
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  return (
    <div className="-mx-4 divide-y divide-border bg-card">
      <ActionButton
        icon={<Pencil className="h-4 w-4 text-muted-foreground" />}
        title={t('members.action.edit')}
        onClick={onEdit}
      />
      <ActionButton
        icon={
          isSuspended ? (
            <Play className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Pause className="h-4 w-4 text-muted-foreground" />
          )
        }
        title={
          isSuspended
            ? t('members.action.resume')
            : t('members.action.suspend')
        }
        loading={updateStatus.isPending}
        onClick={toggleStatus}
      />
      <ActionButton
        icon={<Archive className="h-4 w-4 text-destructive" />}
        title={t('members.action.remove')}
        destructive
        loading={remove.isPending}
        onClick={handleArchive}
      />
    </div>
  );
}

function ActionButton({
  icon,
  title,
  destructive,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  destructive?: boolean;
  loading?: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent disabled:opacity-50"
    >
      <span className="flex h-8 w-8 items-center justify-center">{icon}</span>
      <span
        className={cn(
          'flex-1 text-[15px] font-medium',
          destructive ? 'text-destructive' : 'text-foreground',
        )}
      >
        {title}
      </span>
      {loading ? <Spinner /> : null}
    </button>
  );
}

// ─── Edit slot — defers to MembersPage's existing form via dynamic import
// to avoid duplicating the salary / commission / roles state machine. ────

function EditEmployeeFormSlot({
  member,
  roles,
  rolesLoading,
  onClose,
}: {
  member: MemberProfile['member'];
  roles: Role[];
  rolesLoading: boolean;
  onClose: () => void;
}): React.ReactElement {
  // The full form lives in MembersPage; importing it directly creates a
  // hard dependency from MemberDetailPage → MembersPage which is fine
  // (one is a child of the other in UX). The form is exported below from
  // MembersPage for this very reason.
  const [Comp, setComp] = useState<React.ComponentType<{
    member: MemberProfile['member'];
    roles: Role[];
    rolesLoading: boolean;
    onClose: () => void;
  }> | null>(null);

  // Lazy import on first open so the detail page doesn't pay for the
  // form bundle until the user taps Edit.
  if (!Comp) {
    void import('@/pages/MembersPage').then((mod) => {
      setComp(() => mod.EditEmployeeForm);
    });
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  return (
    <Comp
      member={member}
      roles={roles}
      rolesLoading={rolesLoading}
      onClose={onClose}
    />
  );
}
