/**
 * Mirror of backend `PermissionSlug` enum:
 *   backend/src/common/enums/permission-slug.enum.ts
 *
 * Keep this in sync manually — when adding a slug, update both.
 * Used by `useCan(slug)` and `<Can slug=...>` so typos surface at compile time.
 */
export const PermissionSlug = {
  ORGANIZATIONS_MANAGE: 'organizations.manage',

  MEMBERS_MANAGE: 'members.manage',
  ROLES_MANAGE: 'roles.manage',

  ACCOUNTS_MANAGE: 'accounts.manage',
  ACCOUNTS_READ: 'accounts.read',

  CATEGORIES_MANAGE: 'categories.manage',

  CONTACTS_MANAGE: 'contacts.manage',
  CONTACTS_READ: 'contacts.read',

  PRODUCTS_MANAGE: 'products.manage',
  PRODUCTS_READ: 'products.read',

  TRANSACTIONS_CREATE: 'transactions.create',
  TRANSACTIONS_UPDATE: 'transactions.update',
  TRANSACTIONS_VOID: 'transactions.void',
  TRANSACTIONS_READ: 'transactions.read',

  CASH_FLOWS_CREATE: 'cash_flows.create',
  CASH_FLOWS_READ: 'cash_flows.read',

  REPORTS_READ: 'reports.read',

  SCHEDULED_MANAGE: 'scheduled.manage',
  SCHEDULED_READ: 'scheduled.read',

  COMMISSIONS_READ: 'commissions.read',
  COMMISSIONS_MANAGE: 'commissions.manage',

  AI_MANAGE: 'ai.manage',

  INTEGRATIONS_MANAGE: 'integrations.manage',

  PLANS_MANAGE: 'plans.manage',
} as const;

export type PermissionSlug = (typeof PermissionSlug)[keyof typeof PermissionSlug];
