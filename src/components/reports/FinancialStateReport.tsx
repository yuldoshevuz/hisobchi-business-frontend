import { useState } from 'react';
import {
  Boxes,
  Briefcase,
  ChevronDown,
  ChevronRight,
  FileSearch,
  Wallet,
} from 'lucide-react';
import { useFinancialStateReport } from '@/api/hooks/use-reports';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { ListItem, Section } from '@/components/ui/list-item';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';
import type {
  AccountBalanceRow,
  FinancialStateCurrencyRow,
  PayableLiability,
  ReceivableAsset,
} from '@/types/report.types';

function isoToday(): string {
  const now = new Date();
  const y = now.getFullYear().toString().padStart(4, '0');
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Financial-state snapshot. Defaults to "today" since that's the most common
 * ask. The asOfDate picker drives a server-side recomputation (cash flows
 * replay + stock movements replay), so changing the date refetches.
 *
 * `byContact` is a separate toggle because the per-contact breakdown is a
 * heavier query — keep it opt-in. When ON, receivables/payables expand into
 * collapsible per-contact lists.
 */
export function FinancialStateReport(): React.ReactElement {
  const [asOfDate, setAsOfDate] = useState<string>(isoToday());
  const [byContact, setByContact] = useState<boolean>(false);
  const report = useFinancialStateReport({ asOfDate, byContact });

  return (
    <div className="space-y-4 px-4">
      <div className="space-y-2">
        <Label htmlFor="financial-as-of">Sana</Label>
        <DatePicker id="financial-as-of" value={asOfDate} onChange={setAsOfDate} />
        <p className="text-[12px] text-muted-foreground">
          Hisoblar shu sanagacha bo'lgan harakatlardan qaytadan hisoblanadi.
        </p>
      </div>

      <label
        htmlFor="financial-by-contact"
        className="press flex cursor-pointer items-start gap-3 rounded-xl border border-input bg-card px-3 py-2.5 active:bg-accent"
      >
        <Checkbox
          id="financial-by-contact"
          className="mt-1"
          checked={byContact}
          onCheckedChange={(v) => {
            tgHapticImpact('light');
            setByContact(v === true);
          }}
        />
        <span className="flex-1">
          <span className="block text-[14px] font-medium leading-tight">
            Mijoz/ta'minotchi bo'yicha bo'lib ko'rsatish
          </span>
          <span className="mt-0.5 block text-[12px] text-muted-foreground">
            Qabul qilinadigan / to'lanishi kerak summalarni har bir kontakt bo'yicha
          </span>
        </span>
      </label>

      {report.isPending ? (
        <div className="flex justify-center py-12">
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
      ) : (report.data?.byCurrency ?? []).length === 0 ? (
        <EmptyReport />
      ) : (
        <div className="space-y-3">
          {report.data!.byCurrency.map((row) => (
            <CurrencyCard key={row.currency} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CurrencyCardProps {
  row: FinancialStateCurrencyRow;
}

function CurrencyCard({ row }: CurrencyCardProps): React.ReactElement {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {row.currency}
        </span>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Kapital
          </div>
          <div
            className={cn(
              'text-[18px] font-bold tabular-nums',
              Number(row.equity) >= 0
                ? 'text-[var(--color-help-success)]'
                : 'text-destructive',
            )}
          >
            {formatMoney(row.equity, row.currency)}
          </div>
        </div>
      </div>

      <Section title="Aktivlar">
        <CashRow
          currency={row.currency}
          total={row.assets.cash.total}
          accounts={row.assets.cash.byAccount}
        />
        <OpenItemRow
          label="Qarzdorlik (oldim olishim kerak)"
          icon={<Briefcase className="h-4 w-4" />}
          currency={row.currency}
          bucket={row.assets.receivables}
          tone="success"
        />
        <ListItem
          leading={
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Boxes className="h-4 w-4" />
            </div>
          }
          title="Tovar zaxirasi"
          subtitle="Mahsulotlar tannarxi"
          trailing={
            <span className="text-[15px] font-semibold tabular-nums text-foreground">
              {formatMoney(row.assets.inventory.total, row.currency)}
            </span>
          }
          asStatic
        />
        <ListItem
          asStatic
          title={
            <span className="text-[14px] font-bold text-foreground">
              Jami aktivlar
            </span>
          }
          trailing={
            <span className="text-[16px] font-bold tabular-nums text-foreground">
              {formatMoney(row.assets.total, row.currency)}
            </span>
          }
        />
      </Section>

      <Section title="Passivlar">
        <OpenItemRow
          label="Qarz (to'lashim kerak)"
          icon={<Briefcase className="h-4 w-4" />}
          currency={row.currency}
          bucket={row.liabilities.payables}
          tone="destructive"
        />
        <ListItem
          asStatic
          title={
            <span className="text-[14px] font-bold text-foreground">
              Jami passivlar
            </span>
          }
          trailing={
            <span className="text-[16px] font-bold tabular-nums text-destructive">
              {formatMoney(row.liabilities.total, row.currency)}
            </span>
          }
        />
      </Section>
    </div>
  );
}

interface CashRowProps {
  currency: string;
  total: string;
  accounts: AccountBalanceRow[];
}

function CashRow({
  currency,
  total,
  accounts,
}: CashRowProps): React.ReactElement {
  const [expanded, setExpanded] = useState<boolean>(false);
  const hasBreakdown = accounts.length > 0;

  return (
    <>
      <ListItem
        onClick={hasBreakdown ? () => setExpanded((v) => !v) : undefined}
        leading={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-help-success-16)] text-[var(--color-help-success)]">
            <Wallet className="h-4 w-4" />
          </div>
        }
        title="Naqd va hisoblar"
        subtitle={
          hasBreakdown ? `${accounts.length} ta hisob` : undefined
        }
        trailing={
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tabular-nums text-foreground">
              {formatMoney(total, currency)}
            </span>
            {hasBreakdown ? (
              expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : null}
          </div>
        }
      />
      {expanded && hasBreakdown ? (
        <div className="space-y-1 rounded-xl bg-muted/30 px-3 py-2">
          {accounts.map((a) => (
            <div
              key={a.accountId}
              className="flex items-center justify-between text-[13px]"
            >
              <span className="truncate text-muted-foreground">{a.name}</span>
              <span className="tabular-nums text-foreground">
                {formatMoney(a.balance, currency)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

interface OpenItemRowProps {
  label: string;
  icon: React.ReactNode;
  currency: string;
  bucket: ReceivableAsset | PayableLiability;
  tone: 'success' | 'destructive';
}

function OpenItemRow({
  label,
  icon,
  currency,
  bucket,
  tone,
}: OpenItemRowProps): React.ReactElement {
  const [expanded, setExpanded] = useState<boolean>(false);
  const breakdown = bucket.byContact ?? [];
  const hasBreakdown = breakdown.length > 0;

  return (
    <>
      <ListItem
        onClick={hasBreakdown ? () => setExpanded((v) => !v) : undefined}
        leading={
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              tone === 'success'
                ? 'bg-[var(--color-help-success-16)] text-[var(--color-help-success)]'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            {icon}
          </div>
        }
        title={label}
        subtitle={
          hasBreakdown
            ? `${breakdown.length} ta kontakt`
            : undefined
        }
        trailing={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[15px] font-semibold tabular-nums',
                tone === 'success'
                  ? 'text-[var(--color-help-success)]'
                  : 'text-destructive',
              )}
            >
              {formatMoney(bucket.total, currency)}
            </span>
            {hasBreakdown ? (
              expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : null}
          </div>
        }
      />
      {expanded && hasBreakdown ? (
        <div className="space-y-1 rounded-xl bg-muted/30 px-3 py-2">
          {breakdown.map((c) => (
            <div
              key={`${c.contactId ?? 'none'}-${c.name}`}
              className="flex items-center justify-between text-[13px]"
            >
              <span className="truncate text-muted-foreground">{c.name}</span>
              <span className="tabular-nums text-foreground">
                {formatMoney(c.amount, currency)}
              </span>
            </div>
          ))}
          {bucket.truncated ? (
            <p className="text-[11px] italic text-muted-foreground">
              + boshqalar (50 dan ortiq kontakt)
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function EmptyReport(): React.ReactElement {
  return (
    <div className="px-6 py-12 text-center">
      <FileSearch className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-3 text-[14px] text-muted-foreground">
        Tanlangan sana uchun ma'lumot yo'q
      </p>
    </div>
  );
}

