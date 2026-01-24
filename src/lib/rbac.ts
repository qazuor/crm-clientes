// Role-Based Access Control utilities

export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT';

// Role hierarchy - higher roles include permissions of lower roles
const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 3,
  MANAGER: 2,
  AGENT: 1,
};

/**
 * Check if a user has at least the required role level
 */
export function hasRole(userRole: string | null | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;

  const userLevel = ROLE_HIERARCHY[userRole as UserRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  if (userLevel === undefined || requiredLevel === undefined) {
    return false;
  }

  return userLevel >= requiredLevel;
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: string | null | undefined): boolean {
  return hasRole(userRole, 'ADMIN');
}

/**
 * Check if user is at least manager
 */
export function isManager(userRole: string | null | undefined): boolean {
  return hasRole(userRole, 'MANAGER');
}

/**
 * Check if user is at least agent (any authenticated user)
 */
export function isAgent(userRole: string | null | undefined): boolean {
  return hasRole(userRole, 'AGENT');
}

// Permission definitions
export const PERMISSIONS = {
  // Client permissions
  CLIENTS_VIEW: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],
  CLIENTS_CREATE: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],
  CLIENTS_EDIT: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],
  CLIENTS_DELETE: ['ADMIN', 'MANAGER'] as UserRole[],

  // Activity permissions
  ACTIVITIES_VIEW: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],
  ACTIVITIES_CREATE: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],

  // Stats and reports
  STATS_VIEW: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],

  // Enrichment
  ENRICHMENT_VIEW: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],
  ENRICHMENT_RUN: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],

  // Quota management
  QUOTAS_VIEW: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],
  QUOTAS_RESET: ['ADMIN'] as UserRole[],

  // Admin
  USERS_MANAGE: ['ADMIN'] as UserRole[],
  SETTINGS_MANAGE: ['ADMIN'] as UserRole[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if user has a specific permission
 */
export function hasPermission(userRole: string | null | undefined, permission: Permission): boolean {
  if (!userRole) return false;

  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(userRole as UserRole);
}
