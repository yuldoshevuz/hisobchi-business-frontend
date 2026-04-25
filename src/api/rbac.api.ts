import { api } from './client';
import type {
  CreateRoleRequest,
  PermissionsListResponse,
  Role,
  UpdateRoleRequest,
} from '@/types/rbac.types';

const PERMS_BASE = '/web/permissions';
const ROLES_BASE = '/web/roles';

export const rbacApi = {
  async listPermissions(): Promise<PermissionsListResponse> {
    const { data } = await api.get<PermissionsListResponse>(PERMS_BASE);
    return data;
  },
  async listRoles(): Promise<Role[]> {
    const { data } = await api.get<Role[]>(ROLES_BASE);
    return data;
  },
  async createRole(body: CreateRoleRequest): Promise<Role> {
    const { data } = await api.post<Role>(ROLES_BASE, body);
    return data;
  },
  async updateRole(id: number, body: UpdateRoleRequest): Promise<Role> {
    const { data } = await api.patch<Role>(`${ROLES_BASE}/${id}`, body);
    return data;
  },
  async deleteRole(id: number): Promise<void> {
    await api.delete(`${ROLES_BASE}/${id}`);
  },
};
