import type { PaginatedResponse } from './member.types';

export type ClientType = 'customer' | 'supplier' | 'both';
export type ClientStatus = 'active' | 'archived';

export const CLIENT_TYPE_VALUES: readonly ClientType[] = [
  'customer',
  'supplier',
  'both',
] as const;

export const CLIENT_NAME_MIN_LENGTH = 1;
export const CLIENT_NAME_MAX_LENGTH = 255;
export const CLIENT_PHONE_MAX_LENGTH = 20;
export const CLIENT_NOTES_MAX_LENGTH = 2000;

export interface ClientBalanceRow {
  currency: string;
  receivable: string;
  payable: string;
  net: string;
}

export interface Client {
  id: number;
  name: string;
  type: ClientType;
  phone: string | null;
  creditLimit: string | null;
  notes: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
  balances?: ClientBalanceRow[];
}

export interface ClientBalance {
  clientId: number;
  balances: ClientBalanceRow[];
}

export interface ListClientsQuery {
  page?: number;
  limit?: number;
  type?: ClientType;
  status?: ClientStatus;
  search?: string;
  include?: 'balance';
  /** Bypass pagination — return every matching client in one page. */
  all?: boolean;
}

export interface CreateClientRequest {
  name: string;
  type: ClientType;
  phone?: string;
  creditLimit?: string;
  notes?: string;
}

export interface UpdateClientRequest {
  name?: string;
  type?: ClientType;
  phone?: string | null;
  creditLimit?: string | null;
  notes?: string | null;
  status?: ClientStatus;
}

export type PaginatedClients = PaginatedResponse<Client>;
