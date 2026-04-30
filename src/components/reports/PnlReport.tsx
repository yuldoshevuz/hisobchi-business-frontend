import { useState } from 'react';
import { FileSearch, TrendingDown, TrendingUp } from 'lucide-react';
import { usePnlReport } from '@/api/hooks/use-reports';
import { Spinner } from '@/components/ui/spinner';
import { ListItem, Section } from '@/components/ui/list-item';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PERIOD,
  PeriodPresets,
} from './PeriodPresets';
import type { PnlBucket, PnlCurrencyRow } from '@/types/report.types';

/**
 * P&L (accrual basis). Per-currency card stacks four lines: revenues, COGS,
 * gross profit, expenses, net profit. Category breakdowns nested under
 * revenues / expenses for drill-down.
 */
export function PnlReport(): React.ReactElement {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const report = usePnlReport(period);

  return (
    <div className="space-y-4 px-4">
      <PeriodPresets
        dateFrom={period.dateFrom}
        dateTo={period.dateTo}
        onChange={setPeriod}
      />

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
            <PnlCard key={row.currency} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

interface PnlCardProps {
  row: PnlCurrencyRow;
}

function PnlCard({ row }: PnlCardProps): React.ReactElement {
  const netPositive = Number(row.netProfit) >= 0;
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {row.currency}
        </span>
        <span
          className={cn(
            'flex items-center gap-1 text-[16px] font-bold tabular-nums',
            netPositive
              ? 'text-[var(--color-help-success)]'
              : 'text-destructive',
          )}
        >
          {netPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {formatMoney(row.netProfit, row.currency)}
        </span>
      </div>

      <div className="space-y-2">
        <BucketBlock
          label="Daromadlar"
          accent="success"
          currency={row.currency}
          bucket={row.revenues}
        />
        <SimpleLine
          label="COGS (sotilgan tovarlar tannarxi)"
          amount={row.cogs}
          currency={row.currency}
          tone="muted"
        />
        <SimpleLine
          label="Yalpi foyda"
          amount={row.grossProfit}
          currency={row.currency}
          tone={Number(row.grossProfit) >= 0 ? 'success' : 'destructive'}
          bold
        />
        <BucketBlock
          label="Xarajatlar"
          accent="destructive"
          currency={row.currency}
          bucket={row.expenses}
        />
        <SimpleLine
          label="Sof foyda"
          amount={row.netProfit}
          currency={row.currency}
          tone={netPositive ? 'success' : 'destructive'}
          bold
          large
        />
      </div>
    </div>
  );
}

interface BucketBlockProps {
  label: string;
  accent: 'success' | 'destructive';
  currency: string;
  bucket: PnlBucket;
}

function BucketBlock({
  label,
  accent,
  currency,
  bucket,
}: BucketBlockProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        accent === 'success'
          ? 'border-[var(--color-help-success)]/30 bg-[var(--color-help-success-16)]'
          : 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <span
          className={cn(
            'text-[15px] font-semibold tabular-nums',
            accent === 'success'
              ? 'text-[var(--color-help-success)]'
              : 'text-destructive',
          )}
        >
          {formatMoney(bucket.total, currency)}
        </span>
      </div>
      {bucket.byCategory.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {bucket.byCategory.map((c) => (
            <div
              key={`${c.categoryId ?? 'none'}-${c.name}`}
              className="flex items-center justify-between text-[12px]"
            >
              <span className="truncate text-muted-foreground">{c.name}</span>
              <span className="tabular-nums text-foreground">
                {formatMoney(c.amount, currency)}
              </span>
            </div>
          ))}
          {bucket.truncated ? (
            <p className="text-[11px] italic text-muted-foreground">
              + boshqalar (50 dan ortiq kategoriya)
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-1 text-[12px] text-muted-foreground">
          Ma'lumot yo'q
        </p>
      )}
    </div>
  );
}

interface SimpleLineProps {
  label: string;
  amount: string;
  currency: string;
  tone: 'success' | 'destructive' | 'muted';
  bold?: boolean;
  large?: boolean;
}

function SimpleLine({
  label,
  amount,
  currency,
  tone,
  bold,
  large,
}: SimpleLineProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
      <span
        className={cn(
          large ? 'text-[14px]' : 'text-[13px]',
          bold ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums',
          large ? 'text-[16px]' : 'text-[14px]',
          bold ? 'font-bold' : 'font-medium',
          tone === 'success' && 'text-[var(--color-help-success)]',
          tone === 'destructive' && 'text-destructive',
          tone === 'muted' && 'text-foreground',
        )}
      >
        {formatMoney(amount, currency)}
      </span>
    </div>
  );
}

function EmptyReport(): React.ReactElement {
  return (
    <div className="px-6 py-12 text-center">
      <FileSearch className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-3 text-[14px] text-muted-foreground">
        Tanlangan davr uchun ma'lumot yo'q
      </p>
    </div>
  );
}
