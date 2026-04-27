import { api } from './client';
import type {
  Client,
  ClientBalance,
  CreateClientRequest,
  ListClientsQuery,
  PaginatedClients,
  UpdateClientRequest,
} from '@/types/client.types';

const BASE = '/web/clients';

export const clientsApi = {
  async list(query: ListClientsQuery = {}): Promise<PaginatedClients> {
    const { data } = await api.get<PaginatedClients>(BASE, { params: query });
    return data;
  },
  async getById(id: number): Promise<Client> {
    const { data } = await api.get<Client>(`${BASE}/${id}`);
    return data;
  },
  async getBalance(id: number): Promise<ClientBalance> {
    const { data } = await api.get<ClientBalance>(`${BASE}/${id}/balance`);
    return data;
  },
  async create(body: CreateClientRequest): Promise<Client> {
    const { data } = await api.post<Client>(BASE, body);
    return data;
  },
  async update(id: number, body: UpdateClientRequest): Promise<Client> {
    const { data } = await api.patch<Client>(`${BASE}/${id}`, body);
    return data;
  },
  async archive(id: number): Promise<Client> {
    const { data } = await api.post<Client>(`${BASE}/${id}/archive`);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
