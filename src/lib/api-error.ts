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
  ACCOUNT_NOT_FOUND: 'Hisob topilmadi',
  ACCOUNT_NAME_EXISTS: 'Bu nomli hisob allaqachon mavjud',
  ACCOUNT_BALANCE_NOT_ZERO:
    'Hisob qoldig‘i nolga teng emas. O‘chirish o‘rniga arxivlang',
  ACCOUNT_HAS_CASH_FLOWS:
    'Hisobda faol pul harakatlari mavjud. O‘chirib bo‘lmaydi',
  ACCOUNT_CURRENCY_CHANGE_FORBIDDEN: 'Hisob valyutasini o‘zgartirib bo‘lmaydi',
  ACCOUNT_OPENING_BALANCE_NOT_SUPPORTED:
    'Bu bosqichda boshlang‘ich qoldiq faqat 0 bo‘lishi mumkin',
  ACCOUNT_INVALID_STATUS: 'Hisob statusi noto‘g‘ri',
  INVALID_CURRENCY_CODE: 'Valyuta kodi noto‘g‘ri',
  CATEGORY_NOT_FOUND: 'Kategoriya topilmadi',
  CATEGORY_IN_USE:
    'Bu kategoriya tranzaksiya yoki mahsulotda ishlatilmoqda. O‘chirib bo‘lmaydi',
  CATEGORY_TYPE_MISMATCH:
    'Kategoriya turi tizim kategoriyasiga mos kelmaydi',
  CATEGORY_DUPLICATE_SYSTEM_LINK:
    'Bu tizim kategoriyasi allaqachon qo‘shilgan',
  CATEGORY_INVALID_TYPE: 'Kategoriya turi noto‘g‘ri',
  CATEGORY_ARCHIVED: 'Kategoriya arxivlangan. Avval arxivdan tiklang',
  CATEGORY_NOT_ARCHIVED: 'Kategoriya arxivlanmagan',
  CATEGORY_RESTORE_CONFLICT:
    'Bu nomli faol kategoriya allaqachon mavjud. Avval uni o‘zgartiring',
  UNKNOWN_SYSTEM_CATEGORY: 'Bunday tizim kategoriyasi mavjud emas',
  SYSTEM_CATEGORY_IN_USE: 'Tizim kategoriyasi ishlatilmoqda',
  SYSTEM_CATEGORY_CODE_EXISTS: 'Bu kod bilan tizim kategoriyasi mavjud',
  SYSTEM_CATEGORY_NOT_FOUND: 'Tizim kategoriyasi topilmadi',
  TRANSLATION_LOCALE_UNSUPPORTED: 'Bu til qo‘llab-quvvatlanmaydi',
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
