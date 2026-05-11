import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ArrowDownLeft, ArrowUpRight, FileSearch } from 'lucide-react';
import {
  useCashFlowReport,
  useCashFlowTimeseries,
} from '@/api/hooks/use-reports';
import { ListItem, Section } from '@/components/ui/list-item';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { tgHapticImpact } from '@/lib/telegram';
import {
  DEFAULT_PERIOD,
  PeriodPresets,
} from './PeriodPresets';
import { DonutChart, type DonutSlice } from './charts/DonutChart';
import { MultiLineChart, type ChartSeries } from './charts/MultiLineChart';
import { colorForIndex } from './charts/chart-colors';
import type {
  CashFlowCurrencyRow,
  CashFlowDirection,
  CashFlowDirectionFilter,
  CashFlowReport as CashFlowReportData,
  CashFlowTimeseriesReport,
  CategorySeries,
} from '@/types/report.types';

type DirectionTab = CashFlowDirectionFilter | 'all';

const TOP_CATEGORIES_LIMIT = 7;

/**
 * Cash-flow report screen with charts. Mirrors the layout in the design
 * reference:
 *   1. Period preset chips + raw date pickers (`PeriodPresets`).
 *   2. Currency selector — visible only when the org books in >1 currency.
 *   3. Direction tab strip: Hammasi / Kirim / Chiqim. Donut + trend lock to
 *      the active direction; "Hammasi" shows the summary card list (the
 *      view we shipped before charts existed).
 *   4. Donut: top 7 categories + "Boshqalar" rollup. Tap a slice → swap
 *      the center label.
 *   5. Category list with per-row totals + percentages.
 *   6. Multi-line trend chart from the timeseries endpoint, scoped to the
 *      same direction.
 */
export function CashFlowReport(): React.ReactElement {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [direction, setDirection] = useState<DirectionTab>('out');
  const [activeCurrency, setActiveCurrency] = useState<string | null>(null);

  const report = useCashFlowReport(period);
  // Only fetch the timeseries for the focused direction — the donut covers
  // both anyway, and the trend graph only renders one at a time. Skipping
  // when on "all" keeps the request count down.
  const timeseries = useCashFlowTimeseries(
    {
      ...period,
      ...(direction !== 'all' ? { direction } : {}),
      ...(activeCurrency ? { currency: activeCurrency } : {}),
    },
    { enabled: direction !== 'all' },
  );

  const currencies = report.data?.byCurrency.map((r) => r.currency) ?? [];
  const currentCurrency = activeCurrency ?? currencies[0] ?? null;
  const currentRow =
    report.data?.byCurrency.find((r) => r.currency === currentCurrency) ?? null;

  return (
    <div className="space-y-4 px-4">
      <PeriodPresets
        dateFrom={period.dateFrom}
        dateTo={period.dateTo}
        onChange={setPeriod}
      />

      {currencies.length > 1 ? (
        <CurrencyChips
          currencies={currencies}
          active={currentCurrency}
          onChange={setActiveCurrency}
        />
      ) : null}

      <DirectionTabs value={direction} onChange={setDirection} tFn={t} />

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
        <EmptyReport tFn={t} />
      ) : direction === 'all' ? (
        <AllDirectionsSummary report={report.data!} tFn={t} />
      ) : currentRow ? (
        <DirectionView
          row={currentRow}
          direction={direction}
          timeseries={timeseries.data}
          timeseriesPending={timeseries.isPending}
          tFn={t}
        />
      ) : null}
    </div>
  );
}

interface DirectionViewProps {
  row: CashFlowCurrencyRow;
  direction: CashFlowDirectionFilter;
  timeseries: CashFlowTimeseriesReport | undefined;
  timeseriesPending: boolean;
  tFn: TFunction;
}

function DirectionView({
  row,
  direction,
  timeseries,
  timeseriesPending,
  tFn,
}: DirectionViewProps): React.ReactElement {
  const bucket = direction === 'in' ? row.inflow : row.outflow;
  const slices = buildDonutSlices(bucket, tFn);

  const accentLabel = direction === 'in' ? tFn('report.cash_flow.inflow') : tFn('report.cash_flow.outflow');
  const accentClass =
    direction === 'in'
      ? 'text-[var(--color-help-success)]'
      : 'text-destructive';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 text-center">
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground">
            {accentLabel} ({row.currency})
          </div>
          <div
            className={cn(
              'mt-1 text-[22px] font-bold tabular-nums',
              accentClass,
            )}
          >
            {direction === 'in' ? '+' : '-'}
            {formatMoney(bucket.total)}
            <span className="ml-1 text-[14px] font-normal text-muted-foreground">
              {row.currency}
            </span>
          </div>
        </div>

        {Number(bucket.total) > 0 ? (
          <DonutChart
            slices={slices}
            currency={row.currency}
            centerLabel={accentLabel}
          />
        ) : (
          <div className="py-8 text-center text-[13px] text-muted-foreground">
            {tFn('report.cash_flow.no_data_for_direction', { direction: accentLabel.toLowerCase() })}
          </div>
        )}
      </div>

      {bucket.byCategory.length > 0 ? (
        <Section title={tFn('report.cash_flow.categories')}>
          {bucket.byCategory.slice(0, 8).map((c, i) => {
            const pct = (Number(c.amount) / Number(bucket.total || 1)) * 100;
            return (
              <ListItem
                key={`${c.categoryId ?? 'none'}-${c.name}`}
                asStatic
                leading={
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: colorForIndex(i) + '33' }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: colorForIndex(i) }}
                    />
                  </span>
                }
                title={c.name}
                trailing={
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[14px] font-semibold tabular-nums text-foreground">
                      {formatMoney(c.amount, row.currency)}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {pct.toFixed(0)}%
                    </span>
                  </span>
                }
              />
            );
          })}
          {bucket.truncated ? (
            <ListItem
              asStatic
              title={
                <span className="text-[12px] italic text-muted-foreground">
                  {tFn('report.cash_flow.plus_others')}
                </span>
              }
            />
          ) : null}
        </Section>
      ) : null}

      {timeseriesPending ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : timeseries ? (
        <TrendBlock report={timeseries} currency={row.currency} tFn={tFn} />
      ) : null}
    </div>
  );
}

interface TrendBlockProps {
  report: CashFlowTimeseriesReport;
  currency: string;
  tFn: TFunction;
}

function TrendBlock({
  report,
  currency,
  tFn,
}: TrendBlockProps): React.ReactElement | null {
  const row = report.byCurrency.find((r) => r.currency === currency);
  if (!row || row.series.length === 0) return null;

  const topSeries = row.series.slice(0, 6);
  const xLabels = row.days.map((d) => Number(d.slice(8, 10)).toString());
  const series: ChartSeries[] = topSeries.map((s) => toChartSeries(s));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-2 text-[14px] font-semibold text-foreground">
        {tFn('report.cash_flow.daily_chart')}
      </h3>
      <MultiLineChart xLabels={xLabels} series={series} />
    </div>
  );
}

function toChartSeries(s: CategorySeries): ChartSeries {
  return {
    key: `${s.categoryId ?? 'none'}-${s.name}`,
    label: s.name,
    values: s.points.map((p) => Number(p.amount)),
  };
}

/**
 * Slice builder: top N categories by amount, then a "Boshqalar" rollup. The
 * rollup gets the muted slate color so it visually fades into the background
 * relative to the highlighted top categories.
 */
function buildDonutSlices(bucket: CashFlowDirection, tFn: TFunction): DonutSlice[] {
  const top = bucket.byCategory.slice(0, TOP_CATEGORIES_LIMIT);
  const rest = bucket.byCategory.slice(TOP_CATEGORIES_LIMIT);
  const slices: DonutSlice[] = top.map((c, i) => ({
    key: `${c.categoryId ?? 'none'}-${c.name}`,
    label: c.name,
    value: Number(c.amount),
    color: colorForIndex(i),
  }));
  if (rest.length > 0) {
    const sum = rest.reduce((acc, r) => acc + Number(r.amount), 0);
    slices.push({
      key: 'others',
      label: tFn('report.cash_flow.others'),
      value: sum,
      isOther: true,
    });
  }
  return slices;
}

interface CurrencyChipsProps {
  currencies: string[];
  active: string | null;
  onChange: (next: string) => void;
}

function CurrencyChips({
  currencies,
  active,
  onChange,
}: CurrencyChipsProps): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {currencies.map((c) => {
        const isActive = c === active;
        return (
          <button
            key={c}
            type="button"
            onClick={() => {
              tgHapticImpact('light');
              onChange(c);
            }}
            className={cn(
              'press rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground hover:border-primary',
            )}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

interface DirectionTabsProps {
  value: DirectionTab;
  onChange: (next: DirectionTab) => void;
  tFn: TFunction;
}

function DirectionTabs({
  value,
  onChange,
  tFn,
}: DirectionTabsProps): React.ReactElement {
  const tabs: ReadonlyArray<{ id: DirectionTab; label: string }> = [
    { id: 'all', label: tFn('report.cash_flow.tab_all') },
    { id: 'in', label: tFn('report.cash_flow.tab_in') },
    { id: 'out', label: tFn('report.cash_flow.tab_out') },
  ];
  return (
    <div className="flex gap-1 rounded-xl bg-muted p-1">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (active) return;
              tgHapticImpact('light');
              onChange(tab.id);
            }}
            className={cn(
              'press flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

interface AllDirectionsSummaryProps {
  report: CashFlowReportData;
  tFn: TFunction;
}

function AllDirectionsSummary({
  report,
  tFn,
}: AllDirectionsSummaryProps): React.ReactElement {
  return (
    <div className="space-y-3">
      {report.byCurrency.map((row) => {
        const positive = Number(row.net) >= 0;
        return (
          <div
            key={row.currency}
            className="space-y-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                {row.currency}
              </span>
              <span
                className={cn(
                  'text-[16px] font-bold tabular-nums',
                  positive
                    ? 'text-[var(--color-help-success)]'
                    : 'text-destructive',
                )}
              >
                {positive ? '+' : ''}
                {formatMoney(row.net, row.currency)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SummaryStat
                label={tFn('report.cash_flow.inflow')}
                amount={row.inflow.total}
                currency={row.currency}
                Icon={ArrowDownLeft}
                accent="success"
              />
              <SummaryStat
                label={tFn('report.cash_flow.outflow')}
                amount={row.outflow.total}
                currency={row.currency}
                Icon={ArrowUpRight}
                accent="destructive"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface SummaryStatProps {
  label: string;
  amount: string;
  currency: string;
  Icon: typeof ArrowDownLeft;
  accent: 'success' | 'destructive';
}

function SummaryStat({
  label,
  amount,
  currency,
  Icon,
  accent,
}: SummaryStatProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        accent === 'success'
          ? 'border-[var(--color-help-success)]/30 bg-[var(--color-help-success-16)]'
          : 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
        <Icon
          className={cn(
            'h-3.5 w-3.5',
            accent === 'success'
              ? 'text-[var(--color-help-success)]'
              : 'text-destructive',
          )}
        />
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-[15px] font-semibold tabular-nums',
          accent === 'success'
            ? 'text-[var(--color-help-success)]'
            : 'text-destructive',
        )}
      >
        {formatMoney(amount, currency)}
      </div>
    </div>
  );
}

interface EmptyReportProps {
  tFn: TFunction;
}

function EmptyReport({ tFn }: EmptyReportProps): React.ReactElement {
  return (
    <div className="px-6 py-12 text-center">
      <FileSearch className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-3 text-[14px] text-muted-foreground">
        {tFn('report.cash_flow.no_data_for_period')}
      </p>
    </div>
  );
}
