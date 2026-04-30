import { api } from './client';
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

const BASE = '/web/reports';

export const reportsApi = {
  async cashFlow(query: CashFlowReportQuery): Promise<CashFlowReport> {
    const { data } = await api.get<CashFlowReport>(`${BASE}/cash-flow`, {
      params: query,
    });
    return data;
  },
  async cashFlowTimeseries(
    query: CashFlowTimeseriesQuery,
  ): Promise<CashFlowTimeseriesReport> {
    const { data } = await api.get<CashFlowTimeseriesReport>(
      `${BASE}/cash-flow/timeseries`,
      { params: query },
    );
    return data;
  },
  async pnl(query: PnlReportQuery): Promise<PnlReport> {
    const { data } = await api.get<PnlReport>(`${BASE}/pnl`, { params: query });
    return data;
  },
  async financialState(
    query: FinancialStateQuery,
  ): Promise<FinancialStateReport> {
    const { data } = await api.get<FinancialStateReport>(
      `${BASE}/financial-state`,
      { params: query },
    );
    return data;
  },
  async contacts(query: ContactsReportQuery): Promise<ContactsReport> {
    const { data } = await api.get<ContactsReport>(`${BASE}/contacts`, {
      params: query,
    });
    return data;
  },
};
