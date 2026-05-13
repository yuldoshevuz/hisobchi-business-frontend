import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownAZ,
  ArrowDownZA,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  PauseCircle,
  Percent,
  Phone as PhoneIcon,
  Search,
  Send,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import {
  useAssignMemberRoles,
  useInviteMember,
  useMemberSummary,
  useMembers,
  useUpdateEmployeeDefaults,
  useUpdateStaffMember,
} from '@/api/hooks/use-members';
import {
  formatAmount,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { PermissionSlug } from '@/lib/permission-slugs';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { useLimitGuard } from '@/api/hooks/use-subscription';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import type { Member } from '@/types/member.types';
import type { Role } from '@/types/rbac.types';

interface MembersPageProps {
  /** When true, skips the top PageHeader so the page can be embedded inside Sozlamalar. */
  embedded?: boolean;
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'pending';
type SortKey =
  | 'newest'
  | 'name_asc'
  | 'name_desc'
  | 'salary_desc'
  | 'commission_desc';

const STATUS_FILTERS: ReadonlyArray<{
  value: StatusFilter;
  key: string;
  icon: LucideIcon;
}> = [
  { value: 'all', key: 'members.filter.all', icon: Users },
  { value: 'active', key: 'members.filter.active', icon: CheckCircle2 },
  { value: 'suspended', key: 'members.filter.suspended', icon: PauseCircle },
  { value: 'pending', key: 'members.filter.pending', icon: Clock },
];

const SORT_OPTIONS: ReadonlyArray<{
  value: SortKey;
  key: string;
  icon: LucideIcon;
}> = [
  { value: 'newest', key: 'members.sort.newest', icon: Sparkles },
  { value: 'name_asc', key: 'members.sort.name_asc', icon: ArrowDownAZ },
  { value: 'name_desc', key: 'members.sort.name_desc', icon: ArrowDownZA },
  { value: 'salary_desc', key: 'members.sort.salary_desc', icon: Wallet },
  {
    value: 'commission_desc',
    key: 'members.sort.commission_desc',
    icon: Percent,
  },
];

export function MembersPage({
  embedded = false,
}: MembersPageProps = {}): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isReady } = usePermissions();
  const canManage = useCan(PermissionSlug.MEMBERS_MANAGE);
  // Pull the full list — `all: true` skips pagination so client-side
  // filter / search / sort run against the complete set. Member counts
  // are small (≤ EMPLOYEES_LIMIT, dozens), so the cost is trivial and the
  // UX gains are obvious (instant sort, no page hop).
  const members = useMembers({ all: true }, { enabled: canManage });
  // EMPLOYEES_LIMIT counts the OWNER too — `current` is the live members
  // count for the org (active + inactive but not soft-deleted).
  const memberCount = members.data?.data.length ?? 0;
  const employeeGuard = useLimitGuard('EMPLOYEES_LIMIT', memberCount);
  const [inviteOpen, setInviteOpen] = useState<boolean>(false);
  // Per-member actions (edit / suspend / archive) and rich data view moved
  // to /members/:id (MemberDetailPage). MembersPage is now list-only.

  // ── Filter / sort / search state ────────────────────────────────────────
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [filterOpen, setFilterOpen] = useState<boolean>(false);

  const allMembers = members.data?.data ?? [];

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = allMembers.filter((m) => {
      // Status / type filter
      if (statusFilter === 'active' && m.status !== 'active') return false;
      if (statusFilter === 'suspended' && m.status !== 'suspended') return false;
      if (statusFilter === 'pending' && m.user !== null) return false;
      // Search (name + phone + linked user fields)
      if (q !== '') {
        const haystack = [
          m.name,
          m.phone ?? '',
          m.user?.fullName ?? '',
          m.user?.phoneNumber ?? '',
          ...m.roles.map((r) => r.name),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // Sort. Nulls go LAST for salary / commission so unset rows don't
    // dominate the head of the list on first sort.
    const sorted = [...filtered];
    switch (sortKey) {
      case 'name_asc':
        sorted.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        );
        break;
      case 'name_desc':
        sorted.sort((a, b) =>
          b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }),
        );
        break;
      case 'salary_desc':
        sorted.sort((a, b) => {
          const av = a.defaultSalaryAmount ? Number(a.defaultSalaryAmount) : -1;
          const bv = b.defaultSalaryAmount ? Number(b.defaultSalaryAmount) : -1;
          return bv - av;
        });
        break;
      case 'commission_desc':
        sorted.sort((a, b) => {
          const av = a.defaultCommissionPercentage
            ? Number(a.defaultCommissionPercentage)
            : -1;
          const bv = b.defaultCommissionPercentage
            ? Number(b.defaultCommissionPercentage)
            : -1;
          return bv - av;
        });
        break;
      case 'newest':
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
    }
    return sorted;
  }, [allMembers, search, statusFilter, sortKey]);

  const filtersActive =
    search.trim() !== '' || statusFilter !== 'all' || sortKey !== 'newest';
  // Count the inputs the user changed away from default — only status +
  // sort go through the Filter button; search lives next to it as its
  // own input so it doesn't add to the badge.
  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) + (sortKey !== 'newest' ? 1 : 0);

  function resetFilters(): void {
    setSearch('');
    setStatusFilter('all');
    setSortKey('newest');
  }

  if (isReady && !canManage) {
    return (
      <AccessDeniedView
        title={t('members.title')}
        description={t('members.no_access')}
        hint="members.manage"
      />
    );
  }

  return (
    <div className="pb-32">
      {embedded ? null : (
        <PageHeader
          title={t('members.title')}
          description={t('members.subtitle')}
          large
        />
      )}

      {/* ── Search + filter trigger (matches ProductsPage pattern) ──── */}
      {allMembers.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('members.search_placeholder')}
                className="pl-9 pr-9"
              />
              {search !== '' ? (
                <button
                  type="button"
                  aria-label="clear"
                  onClick={() => {
                    tgHapticImpact('light');
                    setSearch('');
                  }}
                  className="press absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground active:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="default"
              className="relative shrink-0"
              onClick={() => {
                tgHapticImpact('light');
                setFilterOpen(true);
              }}
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 ? (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </div>

          {filtersActive ? (
            <div className="px-5 text-[12px] text-muted-foreground">
              {t('members.filter.result_count', {
                count: filteredSorted.length,
                total: allMembers.length,
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {members.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : members.isError ? (
          <Section>
            <ListItem
              asStatic
              title={
                <span className="text-destructive">
                  {getApiErrorMessage(members.error)}
                </span>
              }
            />
          </Section>
        ) : allMembers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <UserPlus className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-[14px] text-muted-foreground">
              {t('members.empty')}
            </p>
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Search className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-[14px] text-muted-foreground">
              {t('members.empty_filtered')}
            </p>
            <button
              type="button"
              onClick={() => {
                tgHapticImpact('light');
                resetFilters();
              }}
              className="press mt-3 text-[13px] font-medium text-primary"
            >
              {t('members.filter.reset')}
            </button>
          </div>
        ) : (
          <Section>
            {filteredSorted.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                onTap={() => {
                  tgHapticImpact('light');
                  navigate(`/members/${m.id}`);
                }}
              />
            ))}
          </Section>
        )}
      </div>

      {/* Unified filter sheet — 2-col compact grid with icons. Selected
          state is shown via primary tint + ring; no extra "selected"
          label so the modal stays short on small screens. Closing the
          sheet auto-applies (state is live), so the explicit Apply
          button is gone — only a contextual "Reset" link remains. */}
      <Modal
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title={t('members.filter.title')}
      >
        <div className="space-y-4">
          {/* Status section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('members.filter.status_section')}
              </span>
              {statusFilter !== 'all' ? (
                <button
                  type="button"
                  className="press text-[12px] font-medium text-primary"
                  onClick={() => {
                    tgHapticImpact('light');
                    setStatusFilter('all');
                  }}
                >
                  {t('members.filter.reset')}
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_FILTERS.map((f) => {
                const selected = statusFilter === f.value;
                const Icon = f.icon;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => {
                      tgHapticImpact('light');
                      setStatusFilter(f.value);
                    }}
                    className={cn(
                      'press flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px]',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        selected ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <span className="truncate">{t(f.key)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('members.sort.label')}
              </span>
              {sortKey !== 'newest' ? (
                <button
                  type="button"
                  className="press text-[12px] font-medium text-primary"
                  onClick={() => {
                    tgHapticImpact('light');
                    setSortKey('newest');
                  }}
                >
                  {t('members.filter.reset')}
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map((o) => {
                const selected = sortKey === o.value;
                const Icon = o.icon;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      tgHapticImpact('light');
                      setSortKey(o.value);
                    }}
                    className={cn(
                      'press flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px]',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        selected ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <span className="truncate">{t(o.key)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {canManage ? (
        <>
          {!employeeGuard.canCreate && employeeGuard.isReady ? (
            <div className="mx-4 my-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Lock className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-[13px] font-medium text-amber-900">
                  {t('members.limit_title')}
                </div>
                <p className="text-[12px] text-amber-800">
                  {t('members.limit_description', { plan: employeeGuard.label })}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 bg-white"
                onClick={() => {
                  tgHapticImpact('light');
                  navigate('/plans');
                }}
              >
                {t('organizations.plans_button')}
              </Button>
            </div>
          ) : null}
          <ScreenAction>
            <Button
              size="xl"
              disabled={!employeeGuard.canCreate}
              onClick={() => {
                if (!employeeGuard.canCreate) {
                  navigate('/plans');
                  return;
                }
                tgHapticImpact('light');
                setInviteOpen(true);
              }}
            >
              {employeeGuard.canCreate ? (
                <UserPlus className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
              {employeeGuard.canCreate
                ? `${t('members.invite_button')}${
                    employeeGuard.limit !== null && typeof employeeGuard.limit === 'number'
                      ? ` (${employeeGuard.label})`
                      : ''
                  }`
                : t('dashboard.plan_limit_reached')}
            </Button>
          </ScreenAction>
        </>
      ) : null}

      <Modal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title={t('members.invite.title')}
        description={t('members.invite.description')}
      >
        <InviteMemberForm onClose={() => setInviteOpen(false)} />
      </Modal>

    </div>
  );
}

interface MemberRowProps {
  member: Member;
  onTap: () => void;
}

function MemberRow({ member, onTap }: MemberRowProps): React.ReactElement {
  const { t } = useTranslation();
  const initials = member.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const isPending = member.user === null;
  const isSuspended = member.status === 'suspended';
  const tgLinked = member.user?.telegramId != null;

  // Surface the linked User's name only when it differs from the
  // member-row name. Owners often edit one but not the other; showing both
  // helps reconcile a re-named staff row with its underlying account.
  const linkedNameDiffers =
    member.user !== null && member.user.fullName !== member.name;

  return (
    <button
      type="button"
      onClick={onTap}
      className="press flex w-full items-start gap-3 px-4 py-3 text-left active:bg-accent"
    >
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarFallback className="text-[13px]">
            {initials || '?'}
          </AvatarFallback>
        </Avatar>
        <span
          aria-hidden
          className={cn(
            'absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-card',
            isPending
              ? 'bg-amber-400'
              : isSuspended
                ? 'bg-muted-foreground'
                : 'bg-[var(--color-help-success)]',
          )}
        />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Top row: name + status badges */}
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-medium text-foreground">
            {member.name}
          </span>
          {isPending ? (
            <Badge
              variant="outline"
              className="shrink-0 border-amber-300 text-[10px] text-amber-700"
            >
              {t('members.badge.pending')}
            </Badge>
          ) : null}
          {isSuspended ? (
            <Badge variant="destructive" className="shrink-0 text-[10px]">
              {t('members.badge.suspended')}
            </Badge>
          ) : null}
          {tgLinked ? (
            <Send
              aria-label={t('members.badge.tg_linked')}
              className="h-3.5 w-3.5 shrink-0 text-sky-500"
            />
          ) : null}
        </div>

        {/* Contact row: phone (member-side or linked user-side) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
          {member.phone ? (
            <span className="inline-flex items-center gap-1">
              <PhoneIcon className="h-3 w-3" />
              {member.phone}
            </span>
          ) : member.user?.phoneNumber ? (
            <span className="inline-flex items-center gap-1">
              <PhoneIcon className="h-3 w-3" />
              {member.user.phoneNumber}
            </span>
          ) : (
            <span>{t('members.row.no_phone')}</span>
          )}
          {linkedNameDiffers ? (
            <span className="truncate">
              {t('members.row.linked_user', {
                name: member.user!.fullName,
              })}
            </span>
          ) : null}
        </div>

        {/* Payroll row: salary + commission */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px]">
          <span
            className={cn(
              'inline-flex items-center gap-1',
              member.defaultSalaryAmount
                ? 'text-foreground'
                : 'text-muted-foreground',
            )}
          >
            <span className="text-muted-foreground">
              {t('members.row.salary_label')}:
            </span>
            {member.defaultSalaryAmount ? (
              <span className="font-medium">
                {formatMoney(
                  member.defaultSalaryAmount,
                  member.defaultSalaryCurrency ?? undefined,
                )}
              </span>
            ) : (
              <span>—</span>
            )}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1',
              member.defaultCommissionPercentage
                ? 'text-foreground'
                : 'text-muted-foreground',
            )}
          >
            <span className="text-muted-foreground">
              {t('members.row.commission_label')}:
            </span>
            {member.defaultCommissionPercentage ? (
              <span className="font-medium">
                {member.defaultCommissionPercentage}%
              </span>
            ) : (
              <span>—</span>
            )}
          </span>
        </div>

        {/* Roles row */}
        {member.roles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {member.roles.map((r) => (
              <Badge
                key={r.id}
                variant="secondary"
                className="text-[10px]"
              >
                {r.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

// MemberActions + ActionRow moved to MemberDetailPage as ActionSheet —
// per-member status / archive / edit happens on the detail screen now.

interface InviteMemberFormProps {
  onClose: () => void;
}

/**
 * Single-flow invite: name required, phone optional. Backend stores the row
 * without a User account. When the named person later signs up with this
 * phone (or the owner backfills the phone), the auto-link listener
 * reconnects the row so existing salary / commission history transfers
 * over to their User session.
 */
function InviteMemberForm({
  onClose,
}: InviteMemberFormProps): React.ReactElement {
  const { t } = useTranslation();
  const invite = useInviteMember();
  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');

  const trimmedPhone = phone.trim();
  const trimmedName = name.trim();
  // Phone is optional; when filled, must be E.164 — otherwise we'd
  // round-trip an invalid string to the backend.
  const phoneEmpty = trimmedPhone === '' || trimmedPhone === '+';
  const phoneValid = phoneEmpty || /^\+\d{9,15}$/.test(trimmedPhone);
  const nameValid = trimmedName.length >= 2;
  const canSubmit = nameValid && phoneValid;

  const submit = useCallback((): void => {
    invite.mutate(
      {
        fullName: trimmedName,
        ...(phoneEmpty ? {} : { phoneNumber: trimmedPhone }),
      },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
          setPhone('');
          setName('');
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [invite, trimmedPhone, trimmedName, phoneEmpty, onClose]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit || invite.isPending) return;
        submit();
      }}
      className="space-y-4"
    >
      <p className="text-[12px] text-muted-foreground">
        {t('invite_member.hint')}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="invite-name">{t('invite_member.name')}</Label>
        <Input
          id="invite-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('invite_member.name_placeholder')}
          required
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invite-phone">
          {t('invite_member.phone_optional')}
        </Label>
        <Input
          id="invite-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998901234567"
          inputMode="tel"
        />
      </div>
      {invite.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(invite.error)}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!canSubmit || invite.isPending}
      >
        {invite.isPending ? <Spinner /> : null}
        {t('invite_member.submit')}
      </Button>
    </form>
  );
}

interface EditEmployeeFormProps {
  member: Member;
  roles: Role[];
  rolesLoading: boolean;
  onClose: () => void;
}

const EMP_CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB'] as const;

/**
 * Single sheet that edits identity (name / phone), payroll defaults (salary,
 * commission %), AND role assignments. Each block fires its own mutation
 * only when its own diff is non-empty:
 *   - PATCH /:id                → name / phone
 *   - PATCH /:id/employee-defaults  → salary + commission
 *   - POST  /:id/roles          → role assignments
 * Read-only block at the top shows the per-employee summary (earned
 * commissions + paid salaries, by currency) so the owner sees the impact
 * of any change without leaving the sheet.
 */
export function EditEmployeeForm({
  member,
  roles,
  rolesLoading,
  onClose,
}: EditEmployeeFormProps): React.ReactElement {
  const { t } = useTranslation();
  const updateDefaults = useUpdateEmployeeDefaults();
  const updateStaff = useUpdateStaffMember();
  const assign = useAssignMemberRoles();
  const summary = useMemberSummary(member.id);

  const [name, setName] = useState<string>(member.name);
  const [phone, setPhone] = useState<string>(member.phone ?? '');
  const [salary, setSalary] = useState<string>(
    member.defaultSalaryAmount ?? '',
  );
  const [salaryCurrency, setSalaryCurrency] = useState<string>(
    member.defaultSalaryCurrency ?? 'UZS',
  );
  const [percentage, setPercentage] = useState<string>(
    member.defaultCommissionPercentage ?? '',
  );
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(
    new Set(member.roles.map((r) => r.id)),
  );

  function toggleRole(id: number): void {
    tgHapticImpact('light');
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const trimmedSalary = salary.trim();
  const trimmedPercentage = percentage.trim();

  const nameValid = trimmedName.length >= 2;
  const phoneValid = trimmedPhone === '' || /^\+\d{9,15}$/.test(trimmedPhone);
  const salaryValid =
    trimmedSalary === '' ||
    (Number.isFinite(Number(trimmedSalary)) && Number(trimmedSalary) > 0);
  const percentageValid =
    trimmedPercentage === '' ||
    (Number.isFinite(Number(trimmedPercentage)) &&
      Number(trimmedPercentage) >= 0 &&
      Number(trimmedPercentage) <= 100);

  const isValid = nameValid && phoneValid && salaryValid && percentageValid;

  // Diff detection — used to decide which mutations to run on submit.
  const originalName = member.name;
  const originalPhone = member.phone ?? '';
  const identityChanged =
    trimmedName !== originalName || trimmedPhone !== originalPhone;
  const originalSalary = member.defaultSalaryAmount ?? '';
  const originalCurrency = member.defaultSalaryCurrency ?? 'UZS';
  const originalPercentage = member.defaultCommissionPercentage ?? '';
  const defaultsChanged =
    trimmedSalary !== originalSalary ||
    salaryCurrency !== originalCurrency ||
    trimmedPercentage !== originalPercentage;

  const originalRoleIds = new Set(member.roles.map((r) => r.id));
  const rolesChanged =
    selectedRoles.size !== originalRoleIds.size ||
    Array.from(selectedRoles).some((id) => !originalRoleIds.has(id));

  const isPending =
    updateDefaults.isPending || updateStaff.isPending || assign.isPending;

  const submit = useCallback(async (): Promise<void> => {
    if (!isValid) return;
    try {
      if (identityChanged) {
        await updateStaff.mutateAsync({
          id: member.id,
          body: {
            ...(trimmedName !== originalName ? { name: trimmedName } : {}),
            ...(trimmedPhone !== originalPhone
              ? { phone: trimmedPhone === '' ? null : trimmedPhone }
              : {}),
          },
        });
      }
      if (defaultsChanged) {
        await updateDefaults.mutateAsync({
          id: member.id,
          body: {
            defaultSalaryAmount:
              trimmedSalary === '' ? null : trimmedSalary,
            defaultSalaryCurrency:
              trimmedSalary === '' ? null : salaryCurrency,
            defaultCommissionPercentage:
              trimmedPercentage === '' ? null : Number(trimmedPercentage),
          },
        });
      }
      if (rolesChanged) {
        await assign.mutateAsync({
          id: member.id,
          body: { roleIds: Array.from(selectedRoles) },
        });
      }
      tgHapticNotify('success');
      onClose();
    } catch {
      tgHapticNotify('error');
    }
  }, [
    isValid,
    identityChanged,
    defaultsChanged,
    rolesChanged,
    updateStaff,
    updateDefaults,
    assign,
    member.id,
    trimmedName,
    originalName,
    trimmedPhone,
    originalPhone,
    trimmedSalary,
    salaryCurrency,
    trimmedPercentage,
    selectedRoles,
    onClose,
  ]);

  const errorMessage =
    updateDefaults.isError && updateDefaults.error
      ? getApiErrorMessage(updateDefaults.error)
      : updateStaff.isError && updateStaff.error
        ? getApiErrorMessage(updateStaff.error)
        : assign.isError && assign.error
          ? getApiErrorMessage(assign.error)
          : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-5"
    >
      {/* ── Identity (name + phone) ─────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="emp-name">{t('edit_employee.name')}</Label>
        <Input
          id="emp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={t('invite_member.name_placeholder')}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="emp-phone">{t('edit_employee.phone_optional')}</Label>
        <Input
          id="emp-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998901234567"
          inputMode="tel"
        />
      </div>

      {/* ── Read-only earnings / payouts summary ───────────────────────── */}
      {summary.isPending ? (
        <div className="flex justify-center py-3">
          <Spinner className="h-5 w-5" />
        </div>
      ) : summary.data ? (
        <div className="space-y-2 rounded-xl border border-border bg-card/50 p-3">
          <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('edit_employee.summary_title')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[12px] text-muted-foreground">
                {t('edit_employee.summary.commission_earned')}
              </div>
              <div className="mt-1 space-y-0.5">
                {summary.data.commissionsEarned.length === 0 ? (
                  <span className="text-[13px] text-muted-foreground">—</span>
                ) : (
                  summary.data.commissionsEarned.map((c) => (
                    <div key={c.currency} className="text-[13px] font-medium">
                      {formatAmount(c.total)} {c.currency}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground">
                {t('edit_employee.summary.salary_paid')}
              </div>
              <div className="mt-1 space-y-0.5">
                {summary.data.salaryPaid.length === 0 ? (
                  <span className="text-[13px] text-muted-foreground">—</span>
                ) : (
                  summary.data.salaryPaid.map((s) => (
                    <div key={s.currency} className="text-[13px] font-medium">
                      {formatAmount(s.total)} {s.currency}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Oylik (salary) + valyuta ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="emp-salary">{t('edit_employee.salary_optional')}</Label>
          <Input
            id="emp-salary"
            inputMode="decimal"
            value={formatAmount(salary)}
            onChange={(e) => setSalary(unformatAmount(e.target.value))}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('edit_employee.currency')}</Label>
          <div className="flex flex-wrap gap-2">
            {EMP_CURRENCIES.map((c) => {
              const selected = salaryCurrency === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    tgHapticImpact('light');
                    setSalaryCurrency(c);
                  }}
                  className={`press min-w-[56px] rounded-xl border px-2 py-2 text-[13px] font-medium ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Sotuvdan foiz (commission %) ──────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="emp-percentage">{t('edit_employee.commission_optional')}</Label>
        <Input
          id="emp-percentage"
          inputMode="decimal"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          placeholder="0–100"
        />
        <p className="text-[12px] text-muted-foreground">
          {t('edit_employee.commission_hint')}
        </p>
      </div>

      {/* ── Rollar ─────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>{t('edit_employee.roles')}</Label>
        {rolesLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : roles.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            {t('edit_employee.no_roles')}
          </p>
        ) : (
          <div className="-mx-4 divide-y divide-border bg-card">
            {roles.map((r) => (
              <label
                key={r.id}
                htmlFor={`role-${r.id}`}
                className="press flex cursor-pointer items-center gap-3 px-4 py-3 active:bg-accent"
              >
                <Checkbox
                  id={`role-${r.id}`}
                  checked={selectedRoles.has(r.id)}
                  onCheckedChange={() => toggleRole(r.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium">{r.name}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {t('edit_employee.permissions_count', { count: r.permissionSlugs.length })}
                  </div>
                </div>
                {r.isSystem ? (
                  <Badge variant="outline" className="text-[10px]">
                    {t('edit_employee.system_badge')}
                  </Badge>
                ) : null}
              </label>
            ))}
          </div>
        )}
      </div>

      {errorMessage ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        size="xl"
        className="w-full"
        disabled={
          !isValid ||
          isPending ||
          (!identityChanged && !defaultsChanged && !rolesChanged)
        }
      >
        {isPending ? <Spinner className="h-5 w-5" /> : null}
        {t('common.save')}
      </Button>
    </form>
  );
}
