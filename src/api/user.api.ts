import { api } from './client';
import type {
  SetPrimaryOrganizationRequest,
  UpdateProfileRequest,
  User,
} from '@/types/user.types';

const BASE = '/web/users';

export const userApi = {
  async getMe(): Promise<User> {
    const { data } = await api.get<User>(`${BASE}/me`);
    return data;
  },
  async updateMe(body: UpdateProfileRequest): Promise<User> {
    const { data } = await api.patch<User>(`${BASE}/me`, body);
    return data;
  },
  async setPrimaryOrganization(
    body: SetPrimaryOrganizationRequest,
  ): Promise<User> {
    const { data } = await api.patch<User>(
      `${BASE}/me/primary-organization`,
      body,
    );
    return data;
  },
};
