import type { PaginatedResponse } from './member.types';

export type CategoryType = 'expense' | 'income' | 'product';

export const CATEGORY_TYPE_VALUES: readonly CategoryType[] = [
  'expense',
  'income',
  'product',
] as const;

export const CATEGORY_NAME_MIN_LENGTH = 1;
export const CATEGORY_NAME_MAX_LENGTH = 100;
export const CATEGORY_ICON_MAX_LENGTH = 50;

/** Single instantiated category row (returned by write endpoints + GET /:id). */
export interface Category {
  id: number;
  systemCategoryId: number | null;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  isCustomized: boolean;
  isArchived: boolean;
  createdAt: string;
}

/**
 * Merged catalog item returned by `GET /categories`.
 * - `id === null` → system default that has not been instantiated yet for the org.
 * - `id !== null` → either a fully-custom row (`isCustom=true`) or an
 *   instantiated system row (potentially with `isCustomized=true` / `isArchived=true`).
 */
export interface MergedCategory {
  id: number | null;
  systemCategoryId: number | null;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  displayOrder: number | null;
  isCustom: boolean;
  isCustomized: boolean;
  isArchived: boolean;
}

export interface SystemCategory {
  id: number;
  code: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  displayOrder: number;
  isActive: boolean;
  name: string;
  locale: string;
}

export interface ListCategoriesQuery {
  page?: number;
  limit?: number;
  type?: CategoryType;
  includeArchived?: boolean;
  /**
   * Bypass pagination and return the whole merged catalog in one page. Backend
   * still wraps it in `PaginatedResponse`, with `meta.total === data.length`.
   * Used by pickers (product / transaction create forms).
   */
  all?: boolean;
}

export interface ListSystemCategoriesQuery {
  page?: number;
  limit?: number;
  type?: CategoryType;
  locale?: string;
  all?: boolean;
}

export type PaginatedCategories = PaginatedResponse<MergedCategory>;
export type PaginatedSystemCategories = PaginatedResponse<SystemCategory>;

export interface CreateCategoryRequest {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  icon?: string;
  color?: string;
  isArchived?: boolean;
}
