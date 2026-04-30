import { useMemo, useState } from 'react';
import { Search, Users, X } from 'lucide-react';
import { useContactsReport } from '@/api/hooks/use-reports';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ListItem, Section } from '@/components/ui/list-item';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';
import { DEFAULT_PERIOD, PeriodPresets } from './PeriodPresets';
import type {
  ContactType,
  ContactsReportRow,
  ContactsReportTotalsByCurrency,
} from '@/types/report.types';

type TypeFilter = ContactType | 'all';

const TYPE_LABEL: Record<ContactType, string> = {
  customer: 'Mijozlar',
  supplier: 'Ta’minotchilar',
  partner: 'Hamkorlar',
};

const TYPE_BADGE_LABEL: Record<ContactType, string> = {
  customer: 'mijoz',
  supplier: "ta'minotchi",
  partner: 'hamkor',
};

const MONTHS_UZ_SHORT = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn',
  'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
] as const;

/**
 * Contacts report — for each contact in the period, show their face-value
 * volume (sales/purchases/debts) plus the open receivable / payable now.
 *
 * Layout:
 *   1. Period presets (shared with other reports).
 *   2. Type filter chips (Hammasi / Mijozlar / Ta'minotchilar / Hamkorlar).
 *   3. Org-wide totals card (per-currency totals across all listed contacts).
 *   4. Search input — filters rows client-side by name or phone.
 *   5. Per-contact list — each row shows name + relationship + last-activity
 *      date, with a per-currency micro-table inside (sales / purchases /
 *      receivable / payable).
 */
export function ContactsReport(): React.ReactElement {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState<string>('');

  const report = useContactsReport({
    ...period,
    ...(typeFilter !== 'all' ? { contactType: typeFilter } : {}),
  });

  const term = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const rows = report.data?.contacts ?? [];
    if (term === '') return rows;
    return rows.filter((row) =>
      [row.name, row.phone ?? ''].join(' ').toLowerCase().includes(term),
    );
  }, [report.data, term]);

  return (
    <div className="space-y-4 px-4">
      <PeriodPresets
        dateFrom={period.dateFrom}
        dateTo={period.dateTo}
        onChange={setPeriod}
      />

      <TypeChips value={typeFilter} onChange={setTypeFilter} />

      {report.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : report.isError ? (
        <Section>
          <ListItem
            asStatic
            title={
              <span className="text-destructive">
                {getApiErrorMessage(report.error)}
              </span>
            }
          />
        </Section>
      ) : (
        <>
          <TotalsCard totals={report.data?.totals ?? []} />

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kontakt nomi yoki telefoni"
              className="pl-9 pr-9"
            />
            {term !== '' ? (
              <button
                type="button"
                aria-label="Tozalash"
                onClick={() => setSearch('')}
                className="press absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {filtered.length > 0 ? (
            <Section title={`${filtered.length} ta kontakt`}>
              {filtered.map((row) => (
                <ContactRow key={row.contactId} row={row} />
              ))}
            </Section>
          ) : (
            <div className="px-6 py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-[14px] text-muted-foreground">
                {term !== '' || typeFilter !== 'all'
                  ? "Filtrga mos kontakt yo'q"
                  : 'Tanlangan davrda faollik yo‘q'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────── chips ─────

interface TypeChipsProps {
  value: TypeFilter;
  onChange: (next: TypeFilter) => void;
}

function TypeChips({ value, onChange }: TypeChipsProps): React.ReactElement {
  const options: ReadonlyArray<{ key: TypeFilter; label: string }> = [
    { key: 'all', label: 'Hammasi' },
    { key: 'customer', label: TYPE_LABEL.customer },
    { key: 'supplier', label: TYPE_LABEL.supplier },
    { key: 'partner', label: TYPE_LABEL.partner },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ key, label }) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (active) return;
              tgHapticImpact('light');
              onChange(key);
            }}
            className={cn(
              'press rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────── totals card ────

interface TotalsCardProps {
  totals: ContactsReportTotalsByCurrency[];
}

function TotalsCard({ totals }: TotalsCardProps): React.ReactElement {
  if (totals.length === 0) {
    return (
      <div className="rounded-2xl bg-muted/40 p-4 text-center">
        <p className="text-[13px] text-muted-foreground">
          Tanlangan davrda yozuv topilmadi
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {totals.map((t) => (
        <div
          key={t.currency}
          className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4"
        >
          <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Jami {t.currency}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <TotalCell label="Sotuvlar" value={t.totalSales} currency={t.currency} positive />
            <TotalCell label="Xaridlar" value={t.totalPurchases} currency={t.currency} />
            <TotalCell label="Olinadigan" value={t.receivable} currency={t.currency} positive />
            <TotalCell label="Beriladigan" value={t.payable} currency={t.currency} negative />
          </div>
        </div>
      ))}
    </div>
  );
}

interface TotalCellProps {
  label: string;
  value: string;
  currency: string;
  positive?: boolean;
  negative?: boolean;
}

function TotalCell({
  label,
  value,
  currency,
  positive,
  negative,
}: TotalCellProps): React.ReactElement {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'text-[15px] font-semibold tabular-nums',
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

// ────────────────────────────────────────────────────── row ─────────

interface ContactRowProps {
  row: ContactsReportRow;
}

function ContactRow({ row }: ContactRowProps): React.ReactElement {
  const initials = row.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ListItem
      asStatic
      leading={
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-[12px]">
            {initials || '?'}
          </AvatarFallback>
        </Avatar>
      }
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{row.name}</span>
          <Badge variant="secondary" className="text-[10px]">
            {TYPE_BADGE_LABEL[row.type]}
          </Badge>
        </span>
      }
      subtitle={
        <span className="space-y-1.5 block">
          <span className="flex items-center gap-1.5">
            <span className="truncate">{row.phone ?? '—'}</span>
            {row.lastActivityAt ? (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span>oxirgi: {formatDateUz(row.lastActivityAt)}</span>
              </>
            ) : null}
          </span>
          {row.byCurrency.map((c) => (
            <CurrencyMini key={c.currency} c={c} />
          ))}
        </span>
      }
    />
  );
}

interface CurrencyMiniProps {
  c: {
    currency: string;
    totalSales: string;
    totalPurchases: string;
    receivable: string;
    payable: string;
    txCount: number;
  };
}

function CurrencyMini({ c }: CurrencyMiniProps): React.ReactElement {
  // Mini grid showing a contact's volumes + open balances for ONE currency.
  // We surface the four numbers most users glance at (sales/purchases/
  // receivable/payable). Other types (debt_in/out, income/expense) are
  // captured in totals via the aggregate but hidden here to keep the row
  // compact.
  const cells: ReadonlyArray<{ label: string; value: string; tone?: 'pos' | 'neg' }> = [
    { label: 'Sotuv', value: c.totalSales, tone: 'pos' },
    { label: 'Xarid', value: c.totalPurchases },
    { label: 'Olinadigan', value: c.receivable, tone: 'pos' },
    { label: 'Beriladigan', value: c.payable, tone: 'neg' },
  ];
  return (
    <span className="block rounded-lg bg-muted/40 px-2 py-1.5">
      <span className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{c.currency}</span>
        <span>{c.txCount} yozuv</span>
      </span>
      <span className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
        {cells.map((cell) => (
          <span key={cell.label} className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">{cell.label}</span>
            <span
              className={cn(
                'text-[12px] font-medium tabular-nums',
                cell.tone === 'pos'
                  ? 'text-[var(--color-help-success)]'
                  : cell.tone === 'neg'
                    ? 'text-destructive'
                    : 'text-foreground',
              )}
            >
              {formatMoney(cell.value, c.currency)}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────── utils ─────

function formatDateUz(iso: string): string {
  const [datePart] = iso.split('T');
  const [y, m, d] = (datePart ?? '').split('-').map((p) => Number(p));
  if (!y || !m || !d) return iso;
  return `${d.toString().padStart(2, '0')} ${MONTHS_UZ_SHORT[m - 1]} ${y}`;
}
