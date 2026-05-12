import i18n from '@/i18n';

interface PermissionLabel {
  title: string;
  description: string;
}

const KNOWN_MODULES = new Set<string>([
  'organizations',
  'members',
  'roles',
  'accounts',
  'categories',
  'contacts',
  'products',
  'transactions',
  'cash_flows',
  'reports',
  'scheduled',
  'commissions',
  'ai',
  'plans',
]);

const KNOWN_PERMISSIONS = new Set<string>([
  'organizations.manage',
  'members.manage',
  'roles.manage',
  'accounts.manage',
  'accounts.read',
  'categories.manage',
  'contacts.manage',
  'contacts.read',
  'products.manage',
  'products.read',
  'transactions.create',
  'transactions.update',
  'transactions.void',
  'transactions.read',
  'cash_flows.create',
  'cash_flows.read',
  'reports.read',
  'scheduled.manage',
  'scheduled.read',
  'commissions.read',
  'commissions.manage',
  'ai.manage',
  'plans.manage',
]);

export function getPermissionModuleLabel(module: string): string {
  if (!KNOWN_MODULES.has(module)) return module;
  return i18n.t(`permission_meta.module.${module}`);
}

export function getPermissionLabel(slug: string): PermissionLabel {
  if (!KNOWN_PERMISSIONS.has(slug)) {
    return { title: slug, description: '' };
  }
  return {
    title: i18n.t(`permission_meta.permission.${slug}.title`),
    description: i18n.t(`permission_meta.permission.${slug}.description`),
  };
}
