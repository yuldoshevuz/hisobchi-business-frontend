import { api } from './client';
import type {
  CreateOrganizationRequest,
  CurrentOrganization,
  MyOrganization,
  Organization,
  UpdateOrganizationRequest,
} from '@/types/organization.types';

const BASE = '/web/organizations';

export const organizationsApi = {
  async list(): Promise<MyOrganization[]> {
    const { data } = await api.get<MyOrganization[]>(BASE);
    return data;
  },
  async create(body: CreateOrganizationRequest): Promise<Organization> {
    const { data } = await api.post<Organization>(BASE, body);
    return data;
  },
  async getCurrent(): Promise<CurrentOrganization> {
    const { data } = await api.get<CurrentOrganization>(`${BASE}/current`);
    return data;
  },
  async updateCurrent(body: UpdateOrganizationRequest): Promise<Organization> {
    const { data } = await api.patch<Organization>(`${BASE}/current`, body);
    return data;
  },
};
