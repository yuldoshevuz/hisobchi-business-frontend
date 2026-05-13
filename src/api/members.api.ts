import { api } from './client';
import type {
  AssignRolesRequest,
  InviteMemberRequest,
  ListMembersQuery,
  Member,
  MemberProfile,
  MemberSummary,
  OrgEmployeeReport,
  PaginatedResponse,
  UpdateEmployeeDefaultsRequest,
  UpdateMemberStatusRequest,
  UpdateStaffMemberRequest,
} from '@/types/member.types';

const BASE = '/web/members';

export const membersApi = {
  async list(query: ListMembersQuery = {}): Promise<PaginatedResponse<Member>> {
    const { data } = await api.get<PaginatedResponse<Member>>(BASE, {
      params: query,
    });
    return data;
  },
  async invite(body: InviteMemberRequest): Promise<Member> {
    const { data } = await api.post<Member>(BASE, body);
    return data;
  },
  async updateStaff(
    id: number,
    body: UpdateStaffMemberRequest,
  ): Promise<Member> {
    const { data } = await api.patch<Member>(`${BASE}/${id}`, body);
    return data;
  },
  async updateStatus(
    id: number,
    body: UpdateMemberStatusRequest,
  ): Promise<Member> {
    const { data } = await api.patch<Member>(`${BASE}/${id}/status`, body);
    return data;
  },
  async assignRoles(id: number, body: AssignRolesRequest): Promise<Member> {
    const { data } = await api.post<Member>(`${BASE}/${id}/roles`, body);
    return data;
  },
  async updateEmployeeDefaults(
    id: number,
    body: UpdateEmployeeDefaultsRequest,
  ): Promise<Member> {
    const { data } = await api.patch<Member>(
      `${BASE}/${id}/employee-defaults`,
      body,
    );
    return data;
  },
  async getSummary(id: number): Promise<MemberSummary> {
    const { data } = await api.get<MemberSummary>(`${BASE}/${id}/summary`);
    return data;
  },
  async getProfile(id: number): Promise<MemberProfile> {
    const { data } = await api.get<MemberProfile>(`${BASE}/${id}/profile`);
    return data;
  },
  async getOrgSummary(): Promise<OrgEmployeeReport> {
    const { data } = await api.get<OrgEmployeeReport>(`${BASE}/summary`);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
