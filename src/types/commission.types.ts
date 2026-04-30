import type { PaginatedResponse } from './member.types';

export type CommissionStatus = 'active' | 'voided';

export const COMMISSION_STATUS_VALUES: readonly CommissionStatus[] = [
  'active',
  'voided',
] as const;

export interface Commission {
  id: number;
  saleId: number;
  memberId: number;
  amount: string;
  currency: string;
  percentage: string | null;
  status: CommissionStatus;
  createdAt: string;
  createdBy: number;
  voidedAt: string | null;
  voidedReason: string | null;
}

export type PaginatedCommissions = PaginatedResponse<Commission>;

export interface ListCommissionsQuery {
  memberId?: number;
  saleId?: number;
  status?: CommissionStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateCommissionRequest {
  saleId: number;
  memberId: number;
  amount: string;
  percentage?: number;
}

export interface VoidCommissionRequest {
  reason?: string;
}

export interface CommissionsSummaryByCurrency {
  currency: string;
  total: string;
  count: number;
}

export interface CommissionsSummaryRow {
  memberId: number;
  fullName: string;
  byCurrency: CommissionsSummaryByCurrency[];
}
