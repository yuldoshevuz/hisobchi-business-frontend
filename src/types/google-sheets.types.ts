import type { TransactionType } from './transaction.types';

export type GoogleSheetsIntegrationStatus =
  | 'active'
  | 'paused'
  | 'error'
  | 'revoked';

export type GoogleSheetsSyncOperation = 'append' | 'update' | 'delete';
export type GoogleSheetsSyncStatus =
  | 'success'
  | 'failed'
  | 'retrying'
  | 'skipped';

export type SheetsColumnFormat = 'text' | 'number' | 'currency' | 'date';
export type SheetsColumnTransform = 'firstOnly' | 'join' | 'summary';

export interface IntegrationStatus {
  connected: boolean;
  available: boolean;
  integrationId?: number;
  status?: GoogleSheetsIntegrationStatus;
  googleAccountEmail?: string;
  spreadsheetId?: string;
  spreadsheetTitle?: string | null;
  lastSyncAt?: string | null;
  lastErrorMessage?: string | null;
  consecutiveFailures?: number;
}

export interface SpreadsheetSummary {
  id: string;
  name: string;
  modifiedTime: string | null;
  webViewLink: string | null;
}

export interface SheetTab {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
}

export interface SheetHeader {
  column: string;
  header: string;
}

export interface SpreadsheetDetail {
  title: string;
  tabs: SheetTab[];
}

export interface SourceField {
  key: string;
  label: string;
  format: SheetsColumnFormat;
  isArray?: boolean;
}

export interface SourceCatalog {
  transactionType: TransactionType;
  fields: SourceField[];
}

export interface ColumnMapping {
  sourceField: string;
  targetColumn: string;
  targetHeader: string;
  format?: SheetsColumnFormat;
  transform?: SheetsColumnTransform;
}

export interface SheetMapping {
  id: number;
  transactionType: TransactionType;
  sheetTabName: string;
  sheetTabId: number;
  columns: ColumnMapping[];
  trackingColumn: string | null;
  voidMarkerColumn: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertMappingRequest {
  transactionType: TransactionType;
  sheetTabName: string;
  sheetTabId: number;
  columns: ColumnMapping[];
  trackingColumn?: string;
  voidMarkerColumn?: string;
  isActive?: boolean;
}

export interface TestPushResult {
  success: boolean;
  rowNumber?: number | null;
  rowValues?: string[];
  errorMessage?: string | null;
}

export interface SyncLog {
  id: number;
  transactionId: number;
  operation: GoogleSheetsSyncOperation;
  status: GoogleSheetsSyncStatus;
  sheetTabName: string;
  targetRow: number | null;
  errorMessage: string | null;
  createdAt: string;
}

/**
 * Frontend-only label registry. Keeps the consent UI translated even
 * though the backend's source-field catalog ships only uz labels —
 * we override here on the frontend by `field.key`. Missing keys fall
 * back to whatever the backend returned.
 */
export const SOURCE_FIELD_LABEL_KEYS: Record<string, string> = {
  transactionId: 'integrations.sheets.fields.transactionId',
  date: 'integrations.sheets.fields.date',
  amount: 'integrations.sheets.fields.amount',
  currency: 'integrations.sheets.fields.currency',
  paidAmount: 'integrations.sheets.fields.paidAmount',
  paymentStatus: 'integrations.sheets.fields.paymentStatus',
  description: 'integrations.sheets.fields.description',
  status: 'integrations.sheets.fields.status',
  createdAt: 'integrations.sheets.fields.createdAt',
  'createdBy.fullName': 'integrations.sheets.fields.createdByName',
  'contact.name': 'integrations.sheets.fields.contactName',
  'contact.phone': 'integrations.sheets.fields.contactPhone',
  'contact.type': 'integrations.sheets.fields.contactType',
  'category.name': 'integrations.sheets.fields.categoryName',
  'account.name': 'integrations.sheets.fields.accountName',
  'saleItems.summary': 'integrations.sheets.fields.saleItemsSummary',
  'saleItems.totalQuantity': 'integrations.sheets.fields.saleItemsQuantity',
};
