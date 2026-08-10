import type {UserRole} from '@/lib/supabase/database.types';

export const permissions = [
  'account.read',
  'account.update',
  'reseller.access',
  'affiliate.access',
  'support.manage',
  'fulfillment.manage',
  'finance.manage',
  'admin.access',
  'identity.manage',
  'settings.manage',
  'catalog.manage',
  'catalog.read_draft',
  'platform.own'
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Readonly<Record<UserRole, readonly Permission[]>> = {
  customer: ['account.read', 'account.update'],
  reseller: ['account.read', 'account.update', 'reseller.access'],
  affiliate: ['account.read', 'account.update', 'affiliate.access'],
  support: ['account.read', 'support.manage', 'catalog.read_draft'],
  fulfiller: ['account.read', 'fulfillment.manage'],
  finance: ['account.read', 'finance.manage'],
  admin: [
    'account.read',
    'admin.access',
    'identity.manage',
    'settings.manage',
    'catalog.manage',
    'catalog.read_draft'
  ],
  owner: permissions
};

export function can(roles: readonly UserRole[], permission: Permission): boolean {
  return roles.some((role) => rolePermissions[role].includes(permission));
}

export function hasRole(roles: readonly UserRole[], allowed: readonly UserRole[]): boolean {
  return roles.some((role) => allowed.includes(role));
}
