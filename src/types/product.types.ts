import type { PaginatedResponse } from './member.types';

export type ProductStatus = 'active' | 'archived';

/**
 * English enum keys mirroring the backend `UnitOfMeasure`. The UI
 * resolves a localised label per the active tenant locale at render
 * time (see `i18n.units.*`); the wire format is always English.
 */
export const UNIT_OF_MEASURE_VALUES = [
  'piece',
  'kilogram',
  'gram',
  'ton',
  'liter',
  'milliliter',
  'meter',
  'centimeter',
  'kilometer',
  'square_meter',
  'cubic_meter',
  'pack',
  'box',
  'bag',
  'bottle',
  'carton',
  'pair',
  'set',
  'service',
  'hour',
  'day',
  'month',
] as const;
export type UnitOfMeasure = (typeof UNIT_OF_MEASURE_VALUES)[number];
export const DEFAULT_UNIT_OF_MEASURE: UnitOfMeasure = 'piece';

export const PRODUCT_NAME_MIN_LENGTH = 1;
export const PRODUCT_NAME_MAX_LENGTH = 255;
export const STOCK_ADJUSTMENT_REASON_MAX_LENGTH = 255;

export interface Product {
  id: number;
  name: string;
  categoryId: number | null;
  currency: string;
  /** `null` ⇒ stock is not tracked (services / digital goods). */
  currentStock: string | null;
  status: ProductStatus;
  unit: UnitOfMeasure;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  transactionId: number | null;
  quantity: string;
  reason: string;
  balanceAfter: string;
  notes: string | null;
  createdAt: string;
}

export interface ListProductsQuery {
  page?: number;
  limit?: number;
  categoryId?: number;
  status?: ProductStatus;
  search?: string;
  trackStock?: boolean;
  /** Bypass pagination — return every matching product in one page. */
  all?: boolean;
}

export interface CreateProductRequest {
  name: string;
  /** Existing org-scoped category id. Mutually exclusive with `systemCategoryId` — exactly one required. */
  categoryId?: number;
  /** Global `system_categories.id`. Backend lazily instantiates the org row. */
  systemCategoryId?: number;
  currency: string;
  /** Pass `null` (or omit) to mark as non-tracked. */
  currentStock?: string | null;
  /** Unit of measure. Defaults server-side to `piece` when omitted. */
  unit?: UnitOfMeasure;
}

export interface UpdateProductRequest {
  name?: string;
  /** Move to an existing org-scoped category. Mutually exclusive with `systemCategoryId`. */
  categoryId?: number;
  /** Move to (and lazily instantiate) the org row linked to this system category. */
  systemCategoryId?: number;
  status?: ProductStatus;
  /** Toggle stock tracking. Pass a numeric string to enable (with that
   *  opening balance) or `null` to convert the product into a service.
   *  Same-mode edits are ignored server-side — stock changes within
   *  tracked mode go through the dedicated AdjustStock flow. */
  currentStock?: string | null;
  /** Change the product's unit of measure. */
  unit?: UnitOfMeasure;
}

export interface AdjustStockRequest {
  quantity: string;
  reason: string;
  date?: string;
}

export type PaginatedProducts = PaginatedResponse<Product>;
