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
  /** Display name. Owns the label even when `user` is null (staff-only). */
  name: string;
  /** Optional contact phone — used for AI hint resolution & future invite. */
  phone: string | null;
  status: MemberStatus;
  defaultSalaryAmount: string | null;
  defaultSalaryCurrency: string | null;
  defaultCommissionPercentage: string | null;
  /** Null for staff-only members (no backing User account). */
  user: MemberUserSummary | null;
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

/**
 * Register an employee in the organization. Backend does NOT create a User
 * account here. Phone is optional — when provided, the staff row links to
 * an existing User by phone immediately; otherwise it stays unlinked and
 * is back-filled either:
 *   - when the owner edits the member to add a phone, or
 *   - when the named person later signs up with that phone (auto-linker).
 */
export interface InviteMemberRequest {
  fullName: string;
  phoneNumber?: string;
}

export interface UpdateStaffMemberRequest {
  name?: string;
  /** Pass null to clear the phone, a string to set it. Omit to leave unchanged. */
  phone?: string | null;
}

export interface UpdateMemberStatusRequest {
  status: MemberStatus;
}

export interface AssignRolesRequest {
  roleIds: number[];
}

export interface UpdateEmployeeDefaultsRequest {
  defaultSalaryAmount?: string | null;
  defaultSalaryCurrency?: string | null;
  defaultCommissionPercentage?: number | null;
}

export interface MemberAmountByCurrency {
  currency: string;
  total: string;
  count: number;
}

export interface MemberSummary {
  memberId: number;
  commissionsEarned: MemberAmountByCurrency[];
  salaryPaid: MemberAmountByCurrency[];
}

export interface OrgEmployeeReportRow {
  memberId: number;
  name: string;
  phone: string | null;
  commissionsEarned: MemberAmountByCurrency[];
  salaryPaid: MemberAmountByCurrency[];
}

export interface OrgEmployeeReport {
  rows: OrgEmployeeReportRow[];
}

export interface MemberActivityRow {
  id: number;
  type: string;
  amount: string;
  currency: string;
  date: string;
  paymentStatus: string;
  paidAmount: string;
  description: string | null;
  contactName: string | null;
}

export interface MemberCommissionRow {
  id: number;
  saleId: number;
  amount: string;
  currency: string;
  percentage: string | null;
  status: string;
  createdAt: string;
}

export interface MemberProfileStats {
  salesCount: number;
  salesTotals: MemberAmountByCurrency[];
  salesCollected: MemberAmountByCurrency[];
  salesOutstanding: MemberAmountByCurrency[];
  commissionCount: number;
  salaryCount: number;
}

export interface MemberProfile {
  member: Member;
  summary: MemberSummary;
  stats: MemberProfileStats;
  recentSales: MemberActivityRow[];
  recentCommissions: MemberCommissionRow[];
  recentSalaries: MemberActivityRow[];
}
