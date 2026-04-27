export type SupportedLocale = 'uz' | 'ru';

export interface User {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  fullName: string;
  locale: string;
  hasPassword: boolean;
  telegramConnected: boolean;
  primaryOrganizationId: number | null;
  createdAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  locale?: SupportedLocale;
}

export interface SetPrimaryOrganizationRequest {
  organizationId: number;
}
