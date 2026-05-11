import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Phone,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  useArchiveContact,
  useContact,
  useDeleteContact,
  useUpdateContact,
} from '@/api/hooks/use-contacts';
import { useTransactions } from '@/api/hooks/use-transactions';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { EditContactForm } from '@/components/contacts/EditContactForm';
import {
  getContactTypeIcon,
  getContactTypeLabel,
} from '@/components/contacts/contact-meta';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  DonutChart,
  type DonutSlice,
} from '@/components/reports/charts/DonutChart';
import { TransactionListItem } from '@/components/transactions/TransactionListItem';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { PermissionSlug } from '@/lib/permission-slugs';
import {
  TRANSACTION_TYPE_ICON,
  TRANSACTION_TYPE_LABEL,
} from '@/lib/transaction-meta';
import { cn } from '@/lib/utils';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import type { Contact, ContactBalanceRow } from '@/types/contact.types';
import type {
  Transaction,
  TransactionType,
} from '@/types/transaction.types';

const MONTHS_UZ_SHORT = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn',
  'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
] as const;

/**
 * Transaction types we surface in the contact summary. Order = display order
 * for the breakdown grid + donut. Other types (transfer, adjustment, opening,
 * suspense) are operational and never carry a contact, so they're omitted.
 */
const SUMMARY_TYPES: readonly TransactionType[] = [
  'sale',
  'purchase',
  'debt_out',
  'debt_in',
  'income',
  'expense',
] as const;

const SUMMARY_TYPE_PALETTE: Record<TransactionType, string> = {
  sale: 'var(--color-help-success)',
  income: 'var(--color-help-success)',
  debt_in: '#fbbf24',
  purchase: '#3b82f6',
  expense: '#a855f7',
  debt_out: '#ef4444',
  transfer: '#64748b',
  adjustment: '#64748b',
  opening_balance: '#64748b',
  suspense: '#64748b',
};

type TypeFilter = TransactionType | 'all';

interface TypeAggregate {
  type: TransactionType;
  total: number;
  count: number;
}

export function ContactDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idNum = Number(params.id);
  const id = Number.isFinite(idNum) && idNum > 0 ? idNum : null;

  const { isReady } = usePermissions();
  const canRead = useCan(PermissionSlug.CONTACTS_READ);
  const canManage = useCan(PermissionSlug.CONTACTS_MANAGE);
  const canReadTx = useCan(PermissionSlug.TRANSACTIONS_READ);

  const contact = useContact(id);
  const transactions = useTransactions(
    {
      contactId: id ?? undefined,
      status: 'active',
      limit: 100,
    },
    { enabled: canReadTx && id !== null },
  );

  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [activeCurrency, setActiveCurrency] = useState<string | null>(null);

  if (isReady && !canRead) {
    return (
      <AccessDeniedView
        title={t('contact_detail.fallback_title')}
        description={t('contact_detail.no_access_description')}
        hint={t('contact_detail.no_access_hint')}
      />
    );
  }
  if (id === null) {
    return (
      <AccessDeniedView
        title={t('contact_detail.fallback_title')}
        description={t('contact_detail.not_found_description')}
        hint={t('contact_detail.not_found_hint')}
      />
    );
  }

  const contactData = contact.data;
  const txList = transactions.data?.data ?? [];

  // Currencies present in this contact's history. The user picks one to scope
  // the breakdown / donut; default = the first currency seen.
  const currencies = useMemoCurrencies(txList);
  const currentCurrency =
    activeCurrency ?? currencies[0] ?? null;

  const inCurrency = currentCurrency
    ? txList.filter((t) => t.currency === currentCurrency)
    : txList;

  const aggregates = aggregateByType(inCurrency);
  const filteredForList =
    typeFilter === 'all'
      ? txList
      : txList.filter((t) => t.type === typeFilter);

  return (
    <div className="pb-8">
      <PageHeader
        title={contactData?.name ?? t('contacts.title')}
        description={
          contactData ? getContactTypeLabel(contactData.type) : undefined
        }
        large
        showBack
        action={
          canManage && contactData ? (
            <button
              type="button"
              aria-label={t('contact_detail.actions_aria')}
              onClick={() => {
                tgHapticImpact('light');
                setActionsOpen(true);
              }}
              className="press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          ) : null
        }
      />

      {contact.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : contact.isError ? (
        <div className="px-4">
          <Section>
            <ListItem
              asStatic
              title={
                <span className="text-destructive">
                  {getApiErrorMessage(contact.error)}
                </span>
              }
            />
          </Section>
        </div>
      ) : contactData ? (
        <div className="space-y-4">
          <ContactHeader contact={contactData} />
          <BalanceSection balances={contactData.balances ?? []} />

          {currencies.length > 1 ? (
            <CurrencyChips
              currencies={currencies}
              active={currentCurrency}
              onChange={setActiveCurrency}
            />
          ) : null}

          {transactions.isPending ? (
            <div className="flex justify-center py-6">
              <Spinner className="h-6 w-6" />
            </div>
          ) : aggregates.length > 0 ? (
            <>
              <TypeBreakdown
                aggregates={aggregates}
                currency={currentCurrency ?? ''}
              />
              <DonutSection
                aggregates={aggregates}
                currency={currentCurrency ?? ''}
              />
              <TypeFilterChips
                value={typeFilter}
                onChange={setTypeFilter}
                aggregates={aggregates}
              />
            </>
          ) : null}

          <HistorySection
            isPending={transactions.isPending}
            isError={transactions.isError}
            error={transactions.error}
            groups={groupByDate(filteredForList, {
              today: t('common.today'),
              yesterday: t('common.yesterday'),
            })}
            onTap={(tx) => {
              tgHapticImpact('light');
              navigate(`/transactions/${tx.id}`);
            }}
            isFiltered={typeFilter !== 'all'}
          />
        </div>
      ) : null}

      <Modal
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        title={contactData?.name}
        description={contactData?.phone ?? undefined}
      >
        {contactData ? (
          <ContactActions
            contact={contactData}
            onClose={() => setActionsOpen(false)}
            onEdit={() => {
              setActionsOpen(false);
              setEditing(true);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={editing}
        onOpenChange={setEditing}
        title={t('contacts.edit_title')}
        description={contactData?.name}
      >
        {contactData ? (
          <EditContactForm
            contact={contactData}
            onClose={() => setEditing(false)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

// Pulled into its own hook so the no-active-tx empty state below stays simple.
function useMemoCurrencies(rows: Transaction[]): string[] {
  return useMemo(() => {
    const seen = new Set<string>();
    for (const r of rows) seen.add(r.currency);
    return Array.from(seen);
  }, [rows]);
}

function aggregateByType(rows: Transaction[]): TypeAggregate[] {
  const buckets = new Map<TransactionType, TypeAggregate>();
  for (const r of rows) {
    if (!SUMMARY_TYPES.includes(r.type)) continue;
    const cur = buckets.get(r.type) ?? { type: r.type, total: 0, count: 0 };
    const amount = Number(r.amount);
    if (Number.isFinite(amount)) cur.total += amount;
    cur.count += 1;
    buckets.set(r.type, cur);
  }
  return SUMMARY_TYPES.map((t) => buckets.get(t)).filter(
    (x): x is TypeAggregate => x !== undefined && x.count > 0,
  );
}

// ─────────────────────────────────────────── header card ────────────

function ContactHeader({ contact }: { contact: Contact }): React.ReactElement {
  const { t } = useTranslation();
  const TypeIcon = getContactTypeIcon(contact.type);
  const initials = computeInitials(contact.name);

  return (
    <div className="px-4">
      <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-[16px]">
            {initials || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[18px] font-semibold text-foreground">
              {contact.name}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              <TypeIcon className="mr-1 h-3 w-3" />
              {getContactTypeLabel(contact.type)}
            </Badge>
          </div>
          {contact.phone ? (
            <a
              href={`tel:${contact.phone}`}
              className="mt-1 flex items-center gap-1.5 text-[13px] text-primary"
            >
              <Phone className="h-3.5 w-3.5" />
              {contact.phone}
            </a>
          ) : (
            <p className="mt-1 text-[13px] text-muted-foreground">
              {t('contact_detail.no_phone')}
            </p>
          )}
        </div>
      </div>
      {contact.notes ? (
        <p className="mt-2 rounded-xl bg-muted/40 p-3 text-[13px] text-muted-foreground">
          {contact.notes}
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────── balance section ────────

function BalanceSection({
  balances,
}: {
  balances: ContactBalanceRow[];
}): React.ReactElement {
  const { t } = useTranslation();
  if (balances.length === 0) {
    return (
      <div className="px-4">
        <div className="rounded-2xl bg-muted/40 p-4 text-center">
          <p className="text-[13px] text-muted-foreground">
            {t('contact_detail.empty_ledger')}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2 px-4">
      {balances.map((b) => {
        const net = Number(b.net);
        const sign =
          net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral';
        return (
          <div
            key={b.currency}
            className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('contact_detail.balance_label', { currency: b.currency })}
              </span>
              <span
                className={cn(
                  'text-[20px] font-bold tabular-nums',
                  sign === 'positive'
                    ? 'text-[var(--color-help-success)]'
                    : sign === 'negative'
                      ? 'text-destructive'
                      : 'text-foreground',
                )}
              >
                {sign === 'positive' ? '+' : sign === 'negative' ? '−' : ''}
                {formatMoney(Math.abs(net).toString(), b.currency)}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {sign === 'positive'
                ? t('contact_detail.balance_positive')
                : sign === 'negative'
                  ? t('contact_detail.balance_negative')
                  : t('contact_detail.balance_neutral')}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <BalanceCell
                icon={<ArrowDownLeft className="h-3.5 w-3.5" />}
                label={t('contact_detail.receivable')}
                value={b.receivable}
                currency={b.currency}
                positive
              />
              <BalanceCell
                icon={<ArrowUpRight className="h-3.5 w-3.5" />}
                label={t('contact_detail.payable')}
                value={b.payable}
                currency={b.currency}
                negative
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BalanceCell({
  icon,
  label,
  value,
  currency,
  positive,
  negative,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  currency: string;
  positive?: boolean;
  negative?: boolean;
}): React.ReactElement {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 text-[15px] font-semibold tabular-nums',
          positive
            ? 'text-[var(--color-help-success)]'
            : negative
              ? 'text-destructive'
              : 'text-foreground',
        )}
      >
        {formatMoney(value, currency)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── currency chips ─────────

function CurrencyChips({
  currencies,
  active,
  onChange,
}: {
  currencies: string[];
  active: string | null;
  onChange: (next: string) => void;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2 px-4">
      {currencies.map((c) => {
        const isActive = active === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => {
              if (isActive) return;
              tgHapticImpact('light');
              onChange(c);
            }}
            className={cn(
              'press rounded-full border px-3 py-1.5 text-[13px] font-medium',
              isActive
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground',
            )}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────── type breakdown ─────────

function TypeBreakdown({
  aggregates,
  currency,
}: {
  aggregates: TypeAggregate[];
  currency: string;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="px-4">
      <div className="grid grid-cols-2 gap-2">
        {aggregates.map((a) => {
          const Icon = TRANSACTION_TYPE_ICON[a.type];
          return (
            <div
              key={a.type}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Icon
                  className="h-3.5 w-3.5"
                  style={{ color: SUMMARY_TYPE_PALETTE[a.type] }}
                />
                {TRANSACTION_TYPE_LABEL[a.type]}
              </div>
              <div className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">
                {formatMoney(a.total.toString(), currency)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {t('contact_detail.records_count', { count: a.count })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── donut chart ────────────

function DonutSection({
  aggregates,
  currency,
}: {
  aggregates: TypeAggregate[];
  currency: string;
}): React.ReactElement | null {
  const { t } = useTranslation();
  const slices: DonutSlice[] = useMemo(
    () =>
      aggregates
        .filter((a) => a.total > 0)
        .map((a) => ({
          key: a.type,
          label: TRANSACTION_TYPE_LABEL[a.type],
          value: a.total,
          color: SUMMARY_TYPE_PALETTE[a.type],
        })),
    [aggregates],
  );
  if (slices.length === 0) return null;
  return (
    <div className="px-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('contact_detail.type_breakdown_title')}
        </div>
        <div className="mt-2 flex justify-center">
          <DonutChart
            slices={slices}
            currency={currency}
            centerLabel={t('contact_detail.donut_center_label')}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── type chips ─────────────

function TypeFilterChips({
  value,
  onChange,
  aggregates,
}: {
  value: TypeFilter;
  onChange: (next: TypeFilter) => void;
  aggregates: TypeAggregate[];
}): React.ReactElement {
  const { t } = useTranslation();
  const totalCount = aggregates.reduce((acc, a) => acc + a.count, 0);
  return (
    <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2 pb-1">
        <Chip
          active={value === 'all'}
          onClick={() => onChange('all')}
          label={t('contact_detail.filter_all', { count: totalCount })}
        />
        {aggregates.map((a) => (
          <Chip
            key={a.type}
            active={value === a.type}
            onClick={() => onChange(a.type)}
            label={t('contact_detail.filter_item', {
              label: TRANSACTION_TYPE_LABEL[a.type],
              count: a.count,
            })}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => {
        if (active) return;
        tgHapticImpact('light');
        onClick();
      }}
      className={cn(
        'press shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-foreground',
      )}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────── history section ────────

function HistorySection({
  isPending,
  isError,
  error,
  groups,
  onTap,
  isFiltered,
}: {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  groups: Array<{ key: string; label: string; items: Transaction[] }>;
  onTap: (tx: Transaction) => void;
  isFiltered: boolean;
}): React.ReactElement {
  const { t } = useTranslation();
  if (isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-6 w-6" />
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
  if (groups.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-[14px] text-muted-foreground">
          {isFiltered
            ? t('contact_detail.history_empty_filtered')
            : t('contact_detail.history_empty')}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Section key={g.key} title={g.label}>
          {g.items.map((tx) => (
            <TransactionListItem
              key={tx.id}
              transaction={tx}
              onTap={onTap}
            />
          ))}
        </Section>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────── action sheet ───────────

function ContactActions({
  contact,
  onClose,
  onEdit,
}: {
  contact: Contact;
  onClose: () => void;
  onEdit: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const archive = useArchiveContact();
  const restore = useUpdateContact();
  const remove = useDeleteContact();

  function handleArchive(): void {
    if (!confirm(t('contact_detail.confirm_archive', { name: contact.name }))) return;
    tgHapticImpact('medium');
    archive.mutate(contact.id, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  function handleRestore(): void {
    tgHapticImpact('medium');
    restore.mutate(
      { id: contact.id, body: { status: 'active' } },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }

  function handleRemove(): void {
    if (!confirm(t('contact_detail.confirm_delete', { name: contact.name }))) return;
    tgHapticImpact('heavy');
    remove.mutate(contact.id, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
        navigate('/contacts');
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  return (
    <div className="-mx-4 divide-y divide-border bg-card">
      <ActionRow
        icon={<Pencil className="h-4 w-4 text-muted-foreground" />}
        title={t('contact_detail.action.edit')}
        subtitle={t('contact_detail.action.edit_subtitle')}
        onClick={onEdit}
      />
      {contact.status === 'active' ? (
        <ActionRow
          icon={<Archive className="h-4 w-4 text-muted-foreground" />}
          title={t('contact_detail.action.archive')}
          subtitle={t('contact_detail.action.archive_subtitle')}
          onClick={handleArchive}
          loading={archive.isPending}
        />
      ) : (
        <ActionRow
          icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
          title={t('contact_detail.action.restore')}
          subtitle={t('contact_detail.action.restore_subtitle')}
          onClick={handleRestore}
          loading={restore.isPending}
        />
      )}
      <ActionRow
        icon={<Trash2 className="h-4 w-4 text-destructive" />}
        title={t('contact_detail.action.delete')}
        subtitle={t('contact_detail.action.delete_subtitle')}
        destructive
        onClick={handleRemove}
        loading={remove.isPending}
      />
    </div>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  destructive,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
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
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'flex items-center gap-2 text-[15px] font-medium',
            destructive ? 'text-destructive' : 'text-foreground',
          )}
        >
          {icon}
          <span>{title}</span>
        </div>
        {subtitle ? (
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            {subtitle}
          </div>
        ) : null}
      </div>
      {loading ? <Spinner /> : null}
    </button>
  );
}

// ─────────────────────────────────────────── utils ──────────────────

function computeInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface DateHeaderLabels {
  today: string;
  yesterday: string;
}

function groupByDate(
  items: Transaction[],
  labels: DateHeaderLabels,
): Array<{
  key: string;
  label: string;
  items: Transaction[];
}> {
  const buckets = new Map<string, Transaction[]>();
  for (const item of items) {
    const key = item.date.slice(0, 10);
    const list = buckets.get(key);
    if (list) list.push(item);
    else buckets.set(key, [item]);
  }
  return Array.from(buckets.entries()).map(([key, list]) => ({
    key,
    label: formatDateHeader(key, labels),
    items: list,
  }));
}

function formatDateHeader(iso: string, labels: DateHeaderLabels): string {
  const [y, m, d] = iso.split('-').map((p) => Number(p));
  if (!y || !m || !d) return iso;
  const today = new Date();
  const todayKey = isoDate(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = isoDate(yesterday);
  if (iso === todayKey) return labels.today;
  if (iso === yesterdayKey) return labels.yesterday;
  return `${d.toString().padStart(2, '0')} ${MONTHS_UZ_SHORT[m - 1]} ${y}`;
}

function isoDate(d: Date): string {
  const y = d.getFullYear().toString().padStart(4, '0');
  const mo = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${mo}-${day}`;
}
