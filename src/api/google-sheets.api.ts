import { api } from './client';
import type {
  IntegrationStatus,
  SheetHeader,
  SheetMapping,
  SourceCatalog,
  SpreadsheetDetail,
  SpreadsheetSummary,
  SyncLog,
  TestPushResult,
  UpsertMappingRequest,
} from '@/types/google-sheets.types';
import type { TransactionType } from '@/types/transaction.types';

const BASE = '/web/integrations/google-sheets';

export const googleSheetsApi = {
  async status(): Promise<IntegrationStatus> {
    const { data } = await api.get<IntegrationStatus>(`${BASE}/status`);
    return data;
  },

  async startOAuth(returnTo?: string): Promise<{ url: string }> {
    const { data } = await api.post<{ url: string }>(`${BASE}/oauth/start`, {
      returnTo,
    });
    return data;
  },

  async disconnect(): Promise<void> {
    await api.post(`${BASE}/disconnect`);
  },

  async pause(): Promise<IntegrationStatus> {
    const { data } = await api.post<IntegrationStatus>(`${BASE}/pause`);
    return data;
  },

  async resume(): Promise<IntegrationStatus> {
    const { data } = await api.post<IntegrationStatus>(`${BASE}/resume`);
    return data;
  },

  async listSpreadsheets(q?: string): Promise<SpreadsheetSummary[]> {
    const { data } = await api.get<SpreadsheetSummary[]>(`${BASE}/spreadsheets`, {
      params: q ? { q } : undefined,
    });
    return data;
  },

  async selectSpreadsheet(spreadsheetId: string): Promise<SpreadsheetDetail> {
    const { data } = await api.post<SpreadsheetDetail>(
      `${BASE}/spreadsheets/select`,
      { spreadsheetId },
    );
    return data;
  },

  async listTabs(): Promise<SpreadsheetDetail> {
    const { data } = await api.get<SpreadsheetDetail>(`${BASE}/spreadsheets/tabs`);
    return data;
  },

  async readHeaders(tabName: string): Promise<SheetHeader[]> {
    const { data } = await api.get<SheetHeader[]>(
      `${BASE}/spreadsheets/tabs/${encodeURIComponent(tabName)}/headers`,
    );
    return data;
  },

  async sourceFields(type: TransactionType): Promise<SourceCatalog> {
    const { data } = await api.get<SourceCatalog>(
      `${BASE}/source-fields/${type}`,
    );
    return data;
  },

  async listMappings(): Promise<SheetMapping[]> {
    const { data } = await api.get<SheetMapping[]>(`${BASE}/mappings`);
    return data;
  },

  async upsertMapping(body: UpsertMappingRequest): Promise<SheetMapping> {
    const { data } = await api.put<SheetMapping>(`${BASE}/mappings`, body);
    return data;
  },

  async deleteMapping(type: TransactionType): Promise<void> {
    await api.delete(`${BASE}/mappings/${type}`);
  },

  async test(type: TransactionType): Promise<TestPushResult> {
    const { data } = await api.post<TestPushResult>(
      `${BASE}/mappings/${type}/test`,
    );
    return data;
  },

  async syncLogs(limit = 50): Promise<SyncLog[]> {
    const { data } = await api.get<SyncLog[]>(`${BASE}/sync-logs`, {
      params: { limit },
    });
    return data;
  },
};
