import { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types/api-error.types';

/**
 * Map backend MessageKey codes to user-facing Uzbek messages.
 * Keep additions here as new keys ship. Unmapped codes fall back to the
 * backend `message` field, then `error.message`, then the caller's fallback.
 */
const MESSAGE_KEY_TO_UZ: Record<string, string> = {
  MISSING_PERMISSION: 'Sizda ushbu amal uchun ruxsat yo‘q',
  NOT_ORGANIZATION_MEMBER: 'Siz bu tashkilot a‘zosi emassiz',
  FORBIDDEN: 'Ruxsat berilmagan',
  UNAUTHORIZED: 'Avval tizimga kiring',
};

export function getApiErrorCode(error: unknown): string | undefined {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.code ?? body?.messageKey;
  }
  return undefined;
}

export function isMissingPermissionError(error: unknown): boolean {
  return getApiErrorCode(error) === 'MISSING_PERMISSION';
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Xatolik yuz berdi',
): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    const code = body?.code ?? body?.messageKey;
    if (code && MESSAGE_KEY_TO_UZ[code]) return MESSAGE_KEY_TO_UZ[code];
    if (body?.message) {
      if (Array.isArray(body.message)) return body.message.join(', ');
      return body.message;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
