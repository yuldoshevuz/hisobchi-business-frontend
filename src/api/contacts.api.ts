import { api } from './client';
import type {
  Contact,
  ContactBalance,
  CreateContactRequest,
  ListContactsQuery,
  PaginatedContacts,
  UpdateContactRequest,
} from '@/types/contact.types';

const BASE = '/web/contacts';

export const contactsApi = {
  async list(query: ListContactsQuery = {}): Promise<PaginatedContacts> {
    const { data } = await api.get<PaginatedContacts>(BASE, { params: query });
    return data;
  },
  async getById(id: number): Promise<Contact> {
    const { data } = await api.get<Contact>(`${BASE}/${id}`);
    return data;
  },
  async getBalance(id: number): Promise<ContactBalance> {
    const { data } = await api.get<ContactBalance>(`${BASE}/${id}/balance`);
    return data;
  },
  async create(body: CreateContactRequest): Promise<Contact> {
    const { data } = await api.post<Contact>(BASE, body);
    return data;
  },
  async update(id: number, body: UpdateContactRequest): Promise<Contact> {
    const { data } = await api.patch<Contact>(`${BASE}/${id}`, body);
    return data;
  },
  async archive(id: number): Promise<Contact> {
    const { data } = await api.post<Contact>(`${BASE}/${id}/archive`);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
