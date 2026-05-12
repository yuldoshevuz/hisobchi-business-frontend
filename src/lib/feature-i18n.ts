import i18n from '@/i18n';
import type { FeatureCode } from '@/types/subscription.types';

interface FeatureI18n {
  name: string;
  description: string;
}

/**
 * Known feature codes that have translations under the `feature_meta.*`
 * namespace. Unknown codes fall back to the raw code as the name.
 */
const KNOWN_FEATURE_CODES = new Set<string>([
  'EMPLOYEES_LIMIT',
  'ACCOUNT_LIMIT',
  'ORGANIZATION_LIMIT',
  'ADVANCED_REPORTS',
  'MULTI_CURRENCY_SUPPORT',
  'DEBT_TRACKING',
  'ADVANCED_TRANSACTIONS',
  'SCHEDULED_TRANSACTIONS',
  'INVENTORY_MANAGEMENT',
  'ADVANCED_RBAC',
  'SALES_COMMISSION',
]);

export function getFeatureLabel(code: string): FeatureI18n {
  if (!KNOWN_FEATURE_CODES.has(code)) {
    return { name: code, description: '' };
  }
  return {
    name: i18n.t(`feature_meta.${code}.name`),
    description: i18n.t(`feature_meta.${code}.description`),
  };
}

/**
 * Codes that gate broad UI sections — surfaced in the Tariflar page when
 * comparing what each plan unlocks. LIMIT codes are listed separately so
 * the UI can render them as "X dona" / "Cheksiz" instead of yes/no.
 */
export const BOOLEAN_FEATURE_CODES_UZ: ReadonlyArray<FeatureCode> = [
  'ADVANCED_REPORTS',
  'MULTI_CURRENCY_SUPPORT',
  'DEBT_TRACKING',
  'ADVANCED_TRANSACTIONS',
  'SCHEDULED_TRANSACTIONS',
  'INVENTORY_MANAGEMENT',
  'ADVANCED_RBAC',
  'SALES_COMMISSION',
];

export const LIMIT_FEATURE_CODES_UZ: ReadonlyArray<FeatureCode> = [
  'EMPLOYEES_LIMIT',
  'ACCOUNT_LIMIT',
  'ORGANIZATION_LIMIT',
];
