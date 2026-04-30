export type FeatureType = 'BOOLEAN' | 'LIMIT';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

/**
 * Canonical feature codes the backend understands. Tenant pages match
 * against these to render plan-aware UI (locked sections, "Cheksiz"
 * badges, limit-reached banners).
 */
export type FeatureCode =
  | 'EMPLOYEES_LIMIT'
  | 'ACCOUNT_LIMIT'
  | 'ORGANIZATION_LIMIT'
  | 'ADVANCED_REPORTS'
  | 'MULTI_CURRENCY_SUPPORT'
  | 'DEBT_TRACKING'
  | 'ADVANCED_TRANSACTIONS'
  | 'SCHEDULED_TRANSACTIONS'
  | 'INVENTORY_MANAGEMENT'
  | 'ADVANCED_RBAC'
  | 'SALES_COMMISSION';

export interface PlanPrice {
  id: number;
  planId: number;
  durationDays: number;
  price: string;
  currency: string;
  isActive: boolean;
}

export interface PlanFeatureRow {
  featureCode: string;
  featureType: FeatureType;
  isEnabled: boolean;
  limit: number | null;
}

export interface Plan {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  prices: PlanPrice[];
  features: PlanFeatureRow[];
}

export interface SubscriptionRecord {
  id: number;
  userId: number;
  planId: number;
  planPriceId: number | null;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
}

export interface CurrentSubscription {
  subscription: SubscriptionRecord | null;
  plan: Plan | null;
  /**
   * Flat feature map. Encoding mirrors the backend cache:
   *   - BOOLEAN → true (missing key = not granted)
   *   - LIMIT → number cap, or `null` for cheksiz
   */
  features: Record<string, boolean | number | null>;
}
