import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import {
  Coins,
  ListChecks,
  Plus,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useMembers } from '@/api/hooks/use-members';
import {
  useCommissions,
  useCommissionsSummary,
} from '@/api/hooks/use-commissions';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { FeatureGate } from '@/components/FeatureGate';
import { CreateCommissionForm } from '@/components/commissions/CreateCommissionForm';
import { VoidCommissionForm } from '@/components/commissions/VoidCommissionForm';
import {
  COMMISSION_STATUS_LABEL,
} from '@/components/commissions/commissions-meta';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { PermissionSlug } from '@/lib/permission-slugs';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';
import type {
  Commission,
  CommissionsSummaryRow,
  CommissionStatus,
} from '@/types/commission.types';
import type { Member } from '@/types/member.types';

type StatusFilter = CommissionStatus | 'all';
type Tab = 'list' | 'reports';

function getMonthsShort(): readonly string[] {
  return i18n.t('date_picker.months', { returnObjects: true }) as string[];
}

const TAB_DEFS: ReadonlyArray<{ id: Tab; icon: typeof ListChecks }> = [
  { id: 'list', icon: ListChecks },
  { id: 'reports', icon: TrendingUp },
];

export function CommissionsPage(): React.ReactElement {
  const { t } = useTranslation();
  const { isReady } = usePermissions();
  const canRead = useCan(PermissionSlug.COMMISSIONS_READ);
  const canManage = useCan(PermissionSlug.COMMISSIONS_MANAGE);

  const [tab, setTab] = useState<Tab>('list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [memberFilter, setMemberFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [voiding, setVoiding] = useState<Commission | null>(null);

  const list = useCommissions(
    {
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(memberFilter !== 'all' ? { memberId: memberFilter } : {}),
      limit: 100,
    },
    { enabled: canRead && tab === 'list' },
  );
  const summary = useCommissionsSummary({
    enabled: canRead && tab === 'reports',
  });
  const members = useMembers({ all: true }, { enabled: canRead });

  if (isReady && !canRead) {
    return (
      <AccessDeniedView
        title={t('commissions_page.title')}
        description={t('commissions_page.no_access')}
        hint={t('commissions_page.no_access_hint')}
      />
    );
  }

  const memberById = new Map(
    (members.data?.data ?? []).map((m) => [m.id, m] as const),
  );

  const term = search.trim().toLowerCase();
  const rows = list.data?.data ?? [];
  const filteredRows = term
    ? rows.filter((row) => {
        const member = memberById.get(row.memberId);
        const haystack = [
          member?.name ?? '',
          member?.phone ?? '',
          String(row.saleId),
          row.amount,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
    : rows;

  // Active = anything other than the default `status=active` + `member=all`.
  // Search is excluded — it has its own clear button next to the input.
  const filterCount =
    (statusFilter !== 'active' ? 1 : 0) +
    (memberFilter !== 'all' ? 1 : 0);
  const filtersActive = filterCount > 0 || term !== '';

  return (
    <FeatureGate feature="SALES_COMMISSION">
    <div className="pb-32">
      <PageHeader
        title={t('commissions_page.title')}
        description={t('commissions_page.subtitle')}
        large
        showBack
      />

      {/* ── Top tabs ──────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {TAB_DEFS.map((def) => {
            const active = def.id === tab;
            const Icon = def.icon;
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => {
                  if (active) return;
                  tgHapticImpact('light');
                  setTab(def.id);
                }}
                className={cn(
                  'press flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors',
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {t(`commissions_page.tab.${def.id}`)}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'list' ? (
        <ListTab
          isPending={list.isPending}
          isError={list.isError}
          error={list.error}
          rows={filteredRows}
          term={term}
          search={search}
          onSearchChange={setSearch}
          filterCount={filterCount}
          filtersActive={filtersActive}
          onOpenFilters={() => setFiltersOpen(true)}
          onClearFilters={() => {
            setStatusFilter('active');
            setMemberFilter('all');
            setSearch('');
          }}
          memberById={memberById}
          canManage={canManage}
          onVoid={setVoiding}
          onCreate={() => setCreateOpen(true)}
        />
      ) : (
        <ReportsTab
          isPending={summary.isPending}
          isError={summary.isError}
          error={summary.error}
          rows={summary.data ?? []}
        />
      )}

      {canManage && tab === 'list' ? (
        <ScreenAction>
          <Button
            size="xl"
            onClick={() => {
              tgHapticImpact('light');
              setCreateOpen(true);
            }}
          >
            <Plus className="h-5 w-5" />
            {t('commissions_page.new_commission_button')}
          </Button>
        </ScreenAction>
      ) : null}

      <Modal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title={t('commissions_page.filter_title')}
        description={t('commissions_page.filter_description')}
      >
        <FiltersForm
          status={statusFilter}
          member={memberFilter}
          members={members.data?.data ?? []}
          onApply={(s, m) => {
            setStatusFilter(s);
            setMemberFilter(m);
            setFiltersOpen(false);
          }}
          onReset={() => {
            setStatusFilter('active');
            setMemberFilter('all');
            setFiltersOpen(false);
          }}
        />
      </Modal>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('commissions_page.new_commission_title')}
        description={t('commissions_page.new_commission_description')}
      >
        <CreateCommissionForm onClose={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={Boolean(voiding)}
        onOpenChange={(o) => {
          if (!o) setVoiding(null);
        }}
        title={t('commissions_page.void_title')}
        description={
          voiding
            ? `#${voiding.id} · ${formatMoney(voiding.amount, voiding.currency)}`
            : undefined
        }
      >
        {voiding ? (
          <VoidCommissionForm
            commissionId={voiding.id}
            onClose={() => setVoiding(null)}
          />
        ) : null}
      </Modal>
    </div>
    </FeatureGate>
  );
}

// ─────────────────────────────────────────── List tab ───────────────────

interface ListTabProps {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  rows: Commission[];
  term: string;
  search: string;
  onSearchChange: (next: string) => void;
  filterCount: number;
  filtersActive: boolean;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  memberById: Map<number, Member>;
  canManage: boolean;
  onVoid: (commission: Commission) => void;
  onCreate: () => void;
}

function ListTab({
  isPending,
  isError,
  error,
  rows,
  term,
  search,
  onSearchChange,
  filterCount,
  filtersActive,
  onOpenFilters,
  onClearFilters,
  memberById,
  canManage,
  onVoid,
  onCreate,
}: ListTabProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <>
      {/* Search + single filter button */}
      <div className="px-4 pt-1">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('commissions_page.search_placeholder')}
              className="pl-9 pr-9"
            />
            {term !== '' ? (
              <button
                type="button"
                aria-label={t('commissions_page.clear_aria')}
                onClick={() => onSearchChange('')}
                className="press absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={t('commissions_page.filters_aria')}
            onClick={() => {
              tgHapticImpact('light');
              onOpenFilters();
            }}
            className={cn(
              'press relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border active:bg-accent',
              filterCount > 0
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {filterCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {filterCount}
              </span>
            ) : null}
          </button>
        </div>

        {filtersActive ? (
          <button
            type="button"
            onClick={() => {
              tgHapticImpact('light');
              onClearFilters();
            }}
            className="press mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary"
          >
            <X className="h-3.5 w-3.5" />
            {t('commissions_page.clear_all')}
          </button>
        ) : null}
      </div>

      <div className="mt-3">
        {isPending ? (
          <div className="space-y-3 px-4">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : isError ? (
          <div className="px-4">
            <Section>
              <ListItem
                asStatic
                title={
                  <span className="text-destructive">
                    {getApiErrorMessage(error)}
                  </span>
                }
              />
            </Section>
          </div>
        ) : rows.length > 0 ? (
          <GroupedList
            rows={rows}
            memberById={memberById}
            canManage={canManage}
            onVoid={onVoid}
          />
        ) : (
          <EmptyState
            filtered={filtersActive}
            canManage={canManage}
            onCreate={onCreate}
          />
        )}
      </div>
    </>
  );
}

interface GroupedListProps {
  rows: Commission[];
  memberById: Map<number, Member>;
  canManage: boolean;
  onVoid: (commission: Commission) => void;
}

function GroupedList({
  rows,
  memberById,
  canManage,
  onVoid,
}: GroupedListProps): React.ReactElement {
  const { t } = useTranslation();
  const groups = useMemo(
    () =>
      groupByDate(rows, {
        today: t('commissions_page.group.today'),
        yesterday: t('commissions_page.group.yesterday'),
        thisMonth: t('commissions_page.group.this_month'),
      }),
    [rows, t],
  );
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Section key={g.label} title={g.label}>
          {g.rows.map((row) => (
            <CommissionRow
              key={row.id}
              commission={row}
              member={memberById.get(row.memberId) ?? null}
              canManage={canManage}
              onVoid={() => onVoid(row)}
            />
          ))}
        </Section>
      ))}
    </div>
  );
}

interface CommissionRowProps {
  commission: Commission;
  member: Member | null;
  canManage: boolean;
  onVoid: () => void;
}

function CommissionRow({
  commission,
  member,
  canManage,
  onVoid,
}: CommissionRowProps): React.ReactElement {
  const { t } = useTranslation();
  const isActive = commission.status === 'active';
  const initials = computeInitials(member?.name ?? '');

  return (
    <ListItem
      asStatic
      leading={
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-[12px]">
              {initials || '?'}
            </AvatarFallback>
          </Avatar>
          <span
            aria-label={COMMISSION_STATUS_LABEL[commission.status]}
            className={cn(
              'absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-card',
              isActive
                ? 'bg-[var(--color-help-success)]'
                : 'bg-muted-foreground',
            )}
          />
        </div>
      }
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">
            {member?.name ??
              t('commissions_page.employee_fallback', { id: commission.memberId })}
          </span>
          {!isActive ? (
            <Badge variant="secondary" className="text-[10px]">
              {t('commissions_page.voided_badge')}
            </Badge>
          ) : null}
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span>{t('commissions_page.sale_label', { id: commission.saleId })}</span>
          {commission.percentage ? (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>{commission.percentage}%</span>
            </>
          ) : null}
          <span className="text-muted-foreground/50">·</span>
          <span>{formatRowDate(commission.createdAt)}</span>
        </span>
      }
      trailing={
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-right tabular-nums',
              isActive
                ? 'text-[15px] font-semibold text-foreground'
                : 'text-[14px] text-muted-foreground line-through',
            )}
          >
            {formatMoney(commission.amount, commission.currency)}
          </span>
          {canManage && isActive ? (
            <button
              type="button"
              aria-label={t('commissions_page.void_aria')}
              onClick={(e) => {
                e.stopPropagation();
                tgHapticImpact('light');
                onVoid();
              }}
              className="press flex h-8 w-8 items-center justify-center rounded-full text-destructive active:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      }
    />
  );
}

// ─────────────────────────────────────────── Reports tab ────────────────

interface ReportsTabProps {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  rows: CommissionsSummaryRow[];
}

function ReportsTab({
  isPending,
  isError,
  error,
  rows,
}: ReportsTabProps): React.ReactElement {
  const { t } = useTranslation();
  const totals = useMemo(() => {
    const byCurrency = new Map<string, { total: number; count: number }>();
    for (const row of rows) {
      for (const c of row.byCurrency) {
        const cur = byCurrency.get(c.currency) ?? { total: 0, count: 0 };
        cur.total += Number(c.total) || 0;
        cur.count += c.count;
        byCurrency.set(c.currency, cur);
      }
    }
    return Array.from(byCurrency.entries()).map(([currency, v]) => ({
      currency,
      total: v.total.toString(),
      count: v.count,
    }));
  }, [rows]);

  const totalCount = totals.reduce((acc, t) => acc + t.count, 0);

  if (isPending) {
    return (
      <div className="space-y-3 px-4">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4">
        <Section>
          <ListItem
            asStatic
            title={
              <span className="text-destructive">
                {getApiErrorMessage(error)}
              </span>
            }
          />
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4">
      {/* Aggregate hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4">
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          {t('commissions_page.total_active')}
        </div>
        {totals.length > 0 ? (
          <div className="mt-2 space-y-1">
            {totals.map((t) => (
              <div key={t.currency} className="flex items-baseline gap-2">
                <span className="text-[24px] font-bold tabular-nums leading-tight text-foreground">
                  {formatMoney(t.total)}
                </span>
                <span className="text-[14px] font-medium text-muted-foreground">
                  {t.currency}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {t('commissions_page.employees_count', { count: rows.length })}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span>
                {t('commissions_page.records_count', { count: totalCount })}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <div className="text-[24px] font-bold tabular-nums leading-tight text-muted-foreground">
              0
            </div>
            <p className="text-[12px] text-muted-foreground">
              {t('commissions_page.no_active')}
            </p>
          </div>
        )}
      </div>

      {/* Per-employee detail */}
      {rows.length > 0 ? (
        <div className="-mx-4">
          <Section title={t('commissions_page.by_employee')}>
            {rows.map((row) => (
              <ListItem
                key={row.memberId}
                asStatic
                leading={
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-[12px]">
                      {computeInitials(row.fullName) || '?'}
                    </AvatarFallback>
                  </Avatar>
                }
                title={
                  row.fullName ||
                  t('commissions_page.employee_fallback', { id: row.memberId })
                }
                subtitle={
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    {row.byCurrency.map((c, idx) => (
                      <span key={c.currency} className="flex items-center gap-1">
                        {idx > 0 ? (
                          <span className="text-muted-foreground/50">·</span>
                        ) : null}
                        <span className="font-medium tabular-nums text-foreground">
                          {formatMoney(c.total, c.currency)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          ({c.count})
                        </span>
                      </span>
                    ))}
                  </span>
                }
              />
            ))}
          </Section>
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-[14px] text-muted-foreground">
            {t('commissions_page.no_report_data')}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────── filters modal ──────────────

interface FiltersFormProps {
  status: StatusFilter;
  member: number | 'all';
  members: Member[];
  onApply: (status: StatusFilter, member: number | 'all') => void;
  onReset: () => void;
}

function FiltersForm({
  status,
  member,
  members,
  onApply,
  onReset,
}: FiltersFormProps): React.ReactElement {
  const { t } = useTranslation();
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(status);
  const [draftMember, setDraftMember] = useState<number | 'all'>(member);
  const [memberQuery, setMemberQuery] = useState<string>('');

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (q === '') return members;
    return members.filter((m) =>
      [m.name, m.phone ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [members, memberQuery]);

  const statusOptions: ReadonlyArray<{ value: StatusFilter; labelKey: string }> = [
    { value: 'active', labelKey: 'commissions_page.filter.status.active' },
    { value: 'voided', labelKey: 'commissions_page.filter.status.voided' },
    { value: 'all', labelKey: 'commissions_page.filter.status.all' },
  ];

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('commissions_page.filter.status')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((o) => {
            const active = o.value === draftStatus;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  tgHapticImpact('light');
                  setDraftStatus(o.value);
                }}
                className={cn(
                  'press rounded-xl border px-3 py-2 text-[13px] font-medium',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground',
                )}
              >
                {t(o.labelKey)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('commissions_page.filter.employee')}
        </h3>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={memberQuery}
            onChange={(e) => setMemberQuery(e.target.value)}
            placeholder={t('commissions_page.filter.employee_placeholder')}
            className="pl-9"
          />
        </div>
        <div className="-mx-4 max-h-[40vh] overflow-y-auto divide-y divide-border bg-card">
          <ListItem
            onClick={() => {
              tgHapticImpact('light');
              setDraftMember('all');
            }}
            leading={
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users className="h-4 w-4" />
              </div>
            }
            title={t('commissions_page.filter.all_employees')}
            trailing={
              draftMember === 'all' ? (
                <span className="h-4 w-4 rounded-full bg-primary" />
              ) : null
            }
          />
          {filteredMembers.map((m) => {
            const selected = draftMember === m.id;
            return (
              <ListItem
                key={m.id}
                onClick={() => {
                  tgHapticImpact('light');
                  setDraftMember(m.id);
                }}
                leading={
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-[12px]">
                      {computeInitials(m.name) || '?'}
                    </AvatarFallback>
                  </Avatar>
                }
                title={m.name}
                subtitle={m.phone ?? undefined}
                trailing={
                  selected ? (
                    <span className="h-4 w-4 rounded-full bg-primary" />
                  ) : null
                }
              />
            );
          })}
          {filteredMembers.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              {t('commissions_page.filter.no_employee')}
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => {
            tgHapticImpact('light');
            onReset();
          }}
        >
          {t('commissions_page.filter.reset')}
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={() => {
            tgHapticImpact('light');
            onApply(draftStatus, draftMember);
          }}
        >
          {t('commissions_page.filter.apply')}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── shared bits ────────────────

interface EmptyStateProps {
  filtered: boolean;
  canManage: boolean;
  onCreate: () => void;
}

function EmptyState({
  filtered,
  canManage,
  onCreate,
}: EmptyStateProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Coins className="h-7 w-7" />
      </div>
      <p className="mt-4 text-[16px] font-semibold text-foreground">
        {filtered
          ? t('commissions_page.empty_filtered')
          : t('commissions_page.empty_unfiltered')}
      </p>
      <p className="mx-auto mt-1 max-w-[260px] text-[13px] text-muted-foreground">
        {filtered
          ? t('commissions_page.empty_filtered_hint')
          : t('commissions_page.empty_unfiltered_hint')}
      </p>
      {!filtered && canManage ? (
        <Button
          className="mt-4"
          onClick={() => {
            tgHapticImpact('light');
            onCreate();
          }}
        >
          <Plus className="h-4 w-4" />
          {t('commissions_page.new_commission_button')}
        </Button>
      ) : null}
    </div>
  );
}

function SkeletonRow(): React.ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted/70" />
      </div>
      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────── utils ─────

function computeInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface DateGroup {
  label: string;
  rows: Commission[];
}

interface GroupLabels {
  today: string;
  yesterday: string;
  thisMonth: string;
}

function groupByDate(rows: Commission[], labels: GroupLabels): DateGroup[] {
  const today = new Date();
  const todayKey = isoDate(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = isoDate(yesterday);

  const buckets = new Map<string, Commission[]>();
  const ORDER: string[] = [];

  for (const row of rows) {
    const created = new Date(row.createdAt);
    const dateKey = isoDate(created);
    const inSameMonth =
      created.getFullYear() === today.getFullYear() &&
      created.getMonth() === today.getMonth();

    let label: string;
    if (dateKey === todayKey) label = labels.today;
    else if (dateKey === yesterdayKey) label = labels.yesterday;
    else if (inSameMonth) label = labels.thisMonth;
    else
      label = `${getMonthsShort()[created.getMonth()]} ${created.getFullYear()}`;

    if (!buckets.has(label)) {
      buckets.set(label, []);
      ORDER.push(label);
    }
    buckets.get(label)!.push(row);
  }

  return ORDER.map((label) => ({
    label,
    rows: buckets.get(label) ?? [],
  }));
}

function isoDate(d: Date): string {
  const y = d.getFullYear().toString().padStart(4, '0');
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatRowDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  if (isoDate(d) === isoDate(today)) {
    return d.toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return `${d.getDate().toString().padStart(2, '0')} ${getMonthsShort()[d.getMonth()]}`;
}
