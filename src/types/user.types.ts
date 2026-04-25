export type SupportedLocale = 'uz' | 'ru';

export interface User {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  fullName: string;
  locale: string;
  hasPassword: boolean;
  telegramConnected: boolean;
  createdAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  locale?: SupportedLocale;
}
