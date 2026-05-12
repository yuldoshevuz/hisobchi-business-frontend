import { AxiosError } from "axios";
import i18n from "@/i18n";
import type { ApiErrorBody } from "@/types/api-error.types";

/**
 * Backend MessageKey codes that have a translation under the
 * `api_error.*` namespace in the i18n bundles. Unknown codes fall back
 * to the backend `message` field, then `error.message`, then the caller's
 * fallback.
 */
const KNOWN_API_ERROR_CODES = new Set<string>([
  "MISSING_PERMISSION",
  "NOT_ORGANIZATION_MEMBER",
  "FORBIDDEN",
  "UNAUTHORIZED",
  "ACCOUNT_NOT_FOUND",
  "ACCOUNT_NAME_EXISTS",
  "ACCOUNT_BALANCE_NOT_ZERO",
  "ACCOUNT_HAS_CASH_FLOWS",
  "ACCOUNT_CURRENCY_CHANGE_FORBIDDEN",
  "ACCOUNT_OPENING_BALANCE_NOT_SUPPORTED",
  "ACCOUNT_INVALID_STATUS",
  "INVALID_CURRENCY_CODE",
  "CATEGORY_NOT_FOUND",
  "CATEGORY_IN_USE",
  "CATEGORY_TYPE_MISMATCH",
  "CATEGORY_DUPLICATE_SYSTEM_LINK",
  "CATEGORY_INVALID_TYPE",
  "CATEGORY_ARCHIVED",
  "CATEGORY_NOT_ARCHIVED",
  "CATEGORY_RESTORE_CONFLICT",
  "UNKNOWN_SYSTEM_CATEGORY",
  "SYSTEM_CATEGORY_IN_USE",
  "SYSTEM_CATEGORY_CODE_EXISTS",
  "SYSTEM_CATEGORY_NOT_FOUND",
  "TRANSLATION_LOCALE_UNSUPPORTED",
  "CONTACT_NOT_FOUND",
  "CONTACT_PHONE_EXISTS",
  "CONTACT_IN_USE",
  "CONTACT_INVALID_TYPE",
  "CONTACT_INVALID_STATUS",
  "CONTACT_CREDIT_LIMIT_NEGATIVE",
  "PRODUCT_NOT_FOUND",
  "PRODUCT_IN_USE",
  "PRODUCT_NAME_EXISTS",
  "PRODUCT_INVALID_STATUS",
  "PRODUCT_CATEGORY_TYPE_MISMATCH",
  "PRODUCT_DEFAULT_PRICE_NEGATIVE",
  "PRODUCT_DEFAULT_COST_NEGATIVE",
  "STOCK_NOT_TRACKED",
  "STOCK_TRACKING_TOGGLE_FORBIDDEN",
  "NEGATIVE_STOCK",
  "STOCK_ADJUSTMENT_ZERO",
  "CATEGORY_ONE_OF_REQUIRED",
  "OVERPAYMENT_REJECTED",
  "OVERPAYMENT_REQUIRES_FLAG",
  "CURRENCY_MISMATCH",
  "TRANSFER_AMOUNT_MISMATCH",
  "TRANSFER_INVALID_LEGS",
  "TRANSACTION_VOIDED",
  "CASH_FLOW_DIRECTION_MISMATCH",
  "DUPLICATE_DETECTED",
  "OPENING_BALANCE_HAS_CASH_FLOWS",
  "DEBT_CREATE_REQUIRES_CASH_FLOW",
  "IMMUTABLE_FIELD",
  "TRANSACTION_NOT_FOUND",
  "CASH_FLOW_NOT_FOUND",
  "CASH_FLOW_VOID_FORBIDDEN",
  "FEATURE_DISABLED",
  "FEATURE_LIMIT_REACHED",
  "SUBSCRIPTION_REQUIRED",
  "SUBSCRIPTION_NOT_FOUND",
  "PLAN_NOT_FOUND",
  "PLAN_INACTIVE",
  "DEFAULT_PLAN_NOT_CONFIGURED",
]);

export function getApiErrorCode(error: unknown): string | undefined {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.code ?? body?.messageKey;
  }
  return undefined;
}

export function isMissingPermissionError(error: unknown): boolean {
  return getApiErrorCode(error) === "MISSING_PERMISSION";
}

export function isOverpaymentRejected(error: unknown): boolean {
  const code = getApiErrorCode(error);
  return (
    code === "OVERPAYMENT_REJECTED" || code === "OVERPAYMENT_REQUIRES_FLAG"
  );
}

export function isDuplicateDetected(error: unknown): boolean {
  return getApiErrorCode(error) === "DUPLICATE_DETECTED";
}

export function isFeatureDisabled(error: unknown): boolean {
  return getApiErrorCode(error) === "FEATURE_DISABLED";
}

export function isFeatureLimitReached(error: unknown): boolean {
  return getApiErrorCode(error) === "FEATURE_LIMIT_REACHED";
}

/**
 * True for any error indicating the caller should consider upgrading
 * their plan — UI can wrap such errors with an "Tariflarga o'tish" CTA.
 */
export function isSubscriptionGateError(error: unknown): boolean {
  const code = getApiErrorCode(error);
  return (
    code === "FEATURE_DISABLED" ||
    code === "FEATURE_LIMIT_REACHED" ||
    code === "SUBSCRIPTION_REQUIRED"
  );
}

export function getApiErrorDetails(error: unknown): unknown {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.details;
  }
  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const finalFallback = fallback ?? i18n.t("api_error.fallback");
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    const code = body?.code ?? body?.messageKey;
    if (code && KNOWN_API_ERROR_CODES.has(code)) {
      return i18n.t(`api_error.${code}`);
    }
    if (body?.message) {
      if (Array.isArray(body.message)) return body.message.join(", ");
      return body.message;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return finalFallback;
}
