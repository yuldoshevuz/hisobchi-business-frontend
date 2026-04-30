import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/reports.api';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/store/token-store';
import type {
  CashFlowReport,
  CashFlowReportQuery,
  CashFlowTimeseriesQuery,
  CashFlowTimeseriesReport,
  ContactsReport,
  ContactsReportQuery,
  FinancialStateQuery,
  FinancialStateReport,
  PnlReport,
  PnlReportQuery,
} from '@/types/report.types';

export function useCashFlowReport(
  query: CashFlowReportQuery,
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<CashFlowReport, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<CashFlowReport, Error>({
    queryKey: queryKeys.reports.cashFlow(query),
    queryFn: () => reportsApi.cashFlow(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useCashFlowTimeseries(
  query: CashFlowTimeseriesQuery,
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<CashFlowTimeseriesReport, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<CashFlowTimeseriesReport, Error>({
    queryKey: queryKeys.reports.cashFlowTimeseries(query),
    queryFn: () => reportsApi.cashFlowTimeseries(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function usePnlReport(
  query: PnlReportQuery,
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<PnlReport, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<PnlReport, Error>({
    queryKey: queryKeys.reports.pnl(query),
    queryFn: () => reportsApi.pnl(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useFinancialStateReport(
  query: FinancialStateQuery,
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<FinancialStateReport, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<FinancialStateReport, Error>({
    queryKey: queryKeys.reports.financialState(query),
    queryFn: () => reportsApi.financialState(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}

export function useContactsReport(
  query: ContactsReportQuery,
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<ContactsReport, Error>> {
  const callerEnabled = options.enabled ?? true;
  return useQuery<ContactsReport, Error>({
    queryKey: queryKeys.reports.contacts(query),
    queryFn: () => reportsApi.contacts(query),
    enabled: Boolean(tokenStore.getActiveOrgId()) && callerEnabled,
  });
}
