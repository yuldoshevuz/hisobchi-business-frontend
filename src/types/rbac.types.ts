export interface Permission {
  module: string;
  slug: string;
  description: string | null;
}

export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export interface PermissionsListResponse {
  groups: PermissionGroup[];
}

export interface Role {
  id: number;
  name: string;
  isSystem: boolean;
  permissionSlugs: string[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  permissionSlugs: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  permissionSlugs?: string[];
}
