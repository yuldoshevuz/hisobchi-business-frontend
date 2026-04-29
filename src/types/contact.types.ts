import type { PaginatedResponse } from './member.types';

export type ContactType = 'customer' | 'supplier' | 'partner';
export type ContactStatus = 'active' | 'archived';

export const CONTACT_TYPE_VALUES: readonly ContactType[] = [
  'customer',
  'supplier',
  'partner',
] as const;

export const CONTACT_NAME_MIN_LENGTH = 1;
export const CONTACT_NAME_MAX_LENGTH = 255;
export const CONTACT_PHONE_MAX_LENGTH = 20;
export const CONTACT_NOTES_MAX_LENGTH = 2000;

export interface ContactBalanceRow {
  currency: string;
  receivable: string;
  payable: string;
  net: string;
}

export interface Contact {
  id: number;
  name: string;
  type: ContactType;
  phone: string | null;
  creditLimit: string | null;
  notes: string | null;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
  balances?: ContactBalanceRow[];
}

export interface ContactBalance {
  contactId: number;
  balances: ContactBalanceRow[];
}

export interface ListContactsQuery {
  page?: number;
  limit?: number;
  type?: ContactType;
  status?: ContactStatus;
  search?: string;
  include?: 'balance';
  /** Bypass pagination — return every matching contact in one page. */
  all?: boolean;
}

export interface CreateContactRequest {
  name: string;
  type: ContactType;
  phone?: string;
  creditLimit?: string;
  notes?: string;
}

export interface UpdateContactRequest {
  name?: string;
  type?: ContactType;
  phone?: string | null;
  creditLimit?: string | null;
  notes?: string | null;
  status?: ContactStatus;
}

export type PaginatedContacts = PaginatedResponse<Contact>;
