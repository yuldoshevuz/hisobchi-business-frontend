/**
 * Mirrors the backend response DTOs in
 * `backend/src/modules/reports/dtos/response/`. Keep in sync manually —
 * the reports tier is read-only so the shapes are stable, but every new
 * field added on the server must be reflected here so the UI doesn't
 * silently miss it.
 */

export interface ReportPeriod {
  from: string;
  to: string;
}

export interface CategoryBreakdownRow {
  categoryId: number | null;
  name: string;
  amount: string;
}

export interface CashFlowDirection {
  total: string;
  byCategory: CategoryBreakdownRow[];
  truncated?: boolean;
}

export interface CashFlowCurrencyRow {
  currency: string;
  inflow: CashFlowDirection;
  outflow: CashFlowDirection;
  net: string;
}

export interface CashFlowReport {
  period: ReportPeriod;
  byCurrency: CashFlowCurrencyRow[];
}

export interface CashFlowReportQuery {
  dateFrom: string;
  dateTo: string;
  currency?: string;
}

// ─── P&L ───────────────────────────────────────────────────────────────

export interface PnlBucket {
  total: string;
  byCategory: CategoryBreakdownRow[];
  truncated?: boolean;
}

export interface PnlCurrencyRow {
  currency: string;
  revenues: PnlBucket;
  cogs: string;
  grossProfit: string;
  expenses: PnlBucket;
  netProfit: string;
}

export interface PnlReport {
  period: ReportPeriod;
  byCurrency: PnlCurrencyRow[];
}

export interface PnlReportQuery {
  dateFrom: string;
  dateTo: string;
  currency?: string;
}

// ─── Financial state ───────────────────────────────────────────────────

export interface AccountBalanceRow {
  accountId: number;
  name: string;
  balance: string;
}

export interface ContactBreakdownRow {
  contactId: number | null;
  name: string;
  amount: string;
}

export interface CashAsset {
  total: string;
  byAccount: AccountBalanceRow[];
}

export interface ReceivableAsset {
  total: string;
  byContact?: ContactBreakdownRow[];
  truncated?: boolean;
}

export interface InventoryAsset {
  total: string;
}

export interface PayableLiability {
  total: string;
  byContact?: ContactBreakdownRow[];
  truncated?: boolean;
}

export interface FinancialStateAssets {
  cash: CashAsset;
  receivables: ReceivableAsset;
  inventory: InventoryAsset;
  total: string;
}

export interface FinancialStateLiabilities {
  payables: PayableLiability;
  total: string;
}

export interface FinancialStateCurrencyRow {
  currency: string;
  assets: FinancialStateAssets;
  liabilities: FinancialStateLiabilities;
  equity: string;
}

export interface FinancialStateReport {
  asOf: string;
  byCurrency: FinancialStateCurrencyRow[];
}

export interface FinancialStateQuery {
  asOfDate: string;
  currency?: string;
  byContact?: boolean;
}

// ─── Cash flow timeseries (chart) ──────────────────────────────────────

export type CashFlowDirectionFilter = 'in' | 'out';

export interface TimeseriesPoint {
  day: string;
  amount: string;
}

export interface CategorySeries {
  categoryId: number | null;
  name: string;
  total: string;
  points: TimeseriesPoint[];
}

export interface CashFlowTimeseriesCurrencyRow {
  currency: string;
  direction: CashFlowDirectionFilter;
  days: string[];
  series: CategorySeries[];
}

export interface CashFlowTimeseriesReport {
  from: string;
  to: string;
  byCurrency: CashFlowTimeseriesCurrencyRow[];
}

export interface CashFlowTimeseriesQuery {
  dateFrom: string;
  dateTo: string;
  direction?: CashFlowDirectionFilter;
  currency?: string;
}
