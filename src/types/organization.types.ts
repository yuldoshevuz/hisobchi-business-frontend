export type OrganizationStatus = 'active' | 'suspended' | 'archived';

export interface Organization {
  id: number;
  name: string;
  baseCurrency: string;
  locale: string;
  status: OrganizationStatus;
  smsRemindersEnabled: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface MyOrganization extends Organization {
  memberId: number;
  roleNames?: string[] | null;
}

export interface OrganizationViewerContext {
  memberId: number;
  roleNames: string[];
  permissionSlugs: string[];
}

export interface CurrentOrganization extends Organization {
  viewer: OrganizationViewerContext;
}

export interface CreateOrganizationRequest {
  name: string;
  baseCurrency?: string;
  locale?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  baseCurrency?: string;
  locale?: string;
  smsRemindersEnabled?: boolean;
}
