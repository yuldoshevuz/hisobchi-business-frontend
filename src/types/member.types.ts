export type MemberStatus = 'active' | 'suspended';

export interface MemberUserSummary {
  id: number;
  fullName: string;
  phoneNumber: string | null;
  telegramId: number | null;
}

export interface MemberRoleSummary {
  id: number;
  name: string;
  isSystem: boolean;
}

export interface Member {
  id: number;
  status: MemberStatus;
  user: MemberUserSummary;
  roles: MemberRoleSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ListMembersQuery {
  page?: number;
  limit?: number;
  status?: MemberStatus;
  /** Bypass pagination — return every matching member in one page. */
  all?: boolean;
}

export interface InviteMemberRequest {
  phoneNumber: string;
  fullName?: string;
}

export interface UpdateMemberStatusRequest {
  status: MemberStatus;
}

export interface AssignRolesRequest {
  roleIds: number[];
}
