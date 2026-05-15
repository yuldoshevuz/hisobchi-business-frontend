import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { googleSheetsApi } from '@/api/google-sheets.api';
import { tokenStore } from '@/store/token-store';
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

const QK = {
  all: ['google-sheets'] as const,
  status: ['google-sheets', 'status'] as const,
  spreadsheets: (q: string | undefined): readonly unknown[] => [
    'google-sheets',
    'spreadsheets',
    q ?? '',
  ],
  tabs: ['google-sheets', 'tabs'] as const,
  headers: (tab: string): readonly unknown[] => ['google-sheets', 'headers', tab],
  sourceFields: (type: TransactionType): readonly unknown[] => [
    'google-sheets',
    'source-fields',
    type,
  ],
  mappings: ['google-sheets', 'mappings'] as const,
  syncLogs: (limit: number): readonly unknown[] => [
    'google-sheets',
    'sync-logs',
    limit,
  ],
};

export function useGoogleSheetsStatus(): ReturnType<
  typeof useQuery<IntegrationStatus, Error>
> {
  return useQuery<IntegrationStatus, Error>({
    queryKey: QK.status,
    queryFn: () => googleSheetsApi.status(),
    enabled: Boolean(tokenStore.getActiveOrgId()),
    refetchInterval: 30_000,
  });
}

export function useStartGoogleSheetsOAuth(): ReturnType<
  typeof useMutation<{ url: string }, Error, string | undefined>
> {
  return useMutation<{ url: string }, Error, string | undefined>({
    mutationFn: (returnTo) => googleSheetsApi.startOAuth(returnTo),
  });
}

export function useDisconnectGoogleSheets(): ReturnType<
  typeof useMutation<void, Error, void>
> {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => googleSheetsApi.disconnect(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.all });
    },
  });
}

export function usePauseGoogleSheets(): ReturnType<
  typeof useMutation<IntegrationStatus, Error, void>
> {
  const qc = useQueryClient();
  return useMutation<IntegrationStatus, Error, void>({
    mutationFn: () => googleSheetsApi.pause(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.status });
    },
  });
}

export function useResumeGoogleSheets(): ReturnType<
  typeof useMutation<IntegrationStatus, Error, void>
> {
  const qc = useQueryClient();
  return useMutation<IntegrationStatus, Error, void>({
    mutationFn: () => googleSheetsApi.resume(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.status });
    },
  });
}

export function useGoogleSpreadsheets(
  q: string | undefined,
  options: { enabled?: boolean } = {},
): ReturnType<typeof useQuery<SpreadsheetSummary[], Error>> {
  const enabled = options.enabled ?? true;
  return useQuery<SpreadsheetSummary[], Error>({
    queryKey: QK.spreadsheets(q),
    queryFn: () => googleSheetsApi.listSpreadsheets(q),
    enabled: enabled && Boolean(tokenStore.getActiveOrgId()),
  });
}

export function useSelectSpreadsheet(): ReturnType<
  typeof useMutation<SpreadsheetDetail, Error, string>
> {
  const qc = useQueryClient();
  return useMutation<SpreadsheetDetail, Error, string>({
    mutationFn: (id) => googleSheetsApi.selectSpreadsheet(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.all });
    },
  });
}

export function useGoogleSheetsTabs(
  enabled = true,
): ReturnType<typeof useQuery<SpreadsheetDetail, Error>> {
  return useQuery<SpreadsheetDetail, Error>({
    queryKey: QK.tabs,
    queryFn: () => googleSheetsApi.listTabs(),
    enabled: enabled && Boolean(tokenStore.getActiveOrgId()),
  });
}

export function useGoogleSheetHeaders(
  tab: string | null,
): ReturnType<typeof useQuery<SheetHeader[], Error>> {
  return useQuery<SheetHeader[], Error>({
    queryKey: QK.headers(tab ?? ''),
    queryFn: () => googleSheetsApi.readHeaders(tab as string),
    enabled: Boolean(tab) && Boolean(tokenStore.getActiveOrgId()),
  });
}

export function useSheetsSourceFields(
  type: TransactionType,
): ReturnType<typeof useQuery<SourceCatalog, Error>> {
  return useQuery<SourceCatalog, Error>({
    queryKey: QK.sourceFields(type),
    queryFn: () => googleSheetsApi.sourceFields(type),
    enabled: Boolean(tokenStore.getActiveOrgId()),
    staleTime: 60 * 60 * 1000, // 1h — catalog is static-ish
  });
}

export function useSheetMappings(): ReturnType<
  typeof useQuery<SheetMapping[], Error>
> {
  return useQuery<SheetMapping[], Error>({
    queryKey: QK.mappings,
    queryFn: () => googleSheetsApi.listMappings(),
    enabled: Boolean(tokenStore.getActiveOrgId()),
  });
}

export function useUpsertSheetMapping(): ReturnType<
  typeof useMutation<SheetMapping, Error, UpsertMappingRequest>
> {
  const qc = useQueryClient();
  return useMutation<SheetMapping, Error, UpsertMappingRequest>({
    mutationFn: (body) => googleSheetsApi.upsertMapping(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.mappings });
    },
  });
}

export function useDeleteSheetMapping(): ReturnType<
  typeof useMutation<void, Error, TransactionType>
> {
  const qc = useQueryClient();
  return useMutation<void, Error, TransactionType>({
    mutationFn: (type) => googleSheetsApi.deleteMapping(type),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.mappings });
    },
  });
}

export function useTestSheetMapping(): ReturnType<
  typeof useMutation<TestPushResult, Error, TransactionType>
> {
  const qc = useQueryClient();
  return useMutation<TestPushResult, Error, TransactionType>({
    mutationFn: (type) => googleSheetsApi.test(type),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.all });
    },
  });
}

export function useSheetsSyncLogs(
  limit = 50,
): ReturnType<typeof useQuery<SyncLog[], Error>> {
  return useQuery<SyncLog[], Error>({
    queryKey: QK.syncLogs(limit),
    queryFn: () => googleSheetsApi.syncLogs(limit),
    enabled: Boolean(tokenStore.getActiveOrgId()),
    refetchInterval: 15_000,
  });
}
