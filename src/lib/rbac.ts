// Role-Based Access Control utilities
// NOTE: All permission checks are disabled - all authenticated users have full access
// All users have full access regardless of their role

export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT';

// Role hierarchy - kept for reference only
const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 3,
  MANAGER: 2,
  AGENT: 1,
};

/**
 * Check if a user has at least the required role level
 * @deprecated All users now have full access - always returns true for authenticated users
 */
export function hasRole(userRole: string | null | undefined, _requiredRole: UserRole): boolean {
  // All authenticated users have access
  return !!userRole;
}

/**
 * Check if user is admin
 * @deprecated All users now have full access - always returns true for authenticated users
 */
export function isAdmin(userRole: string | null | undefined): boolean {
  return !!userRole;
}

/**
 * Check if user is at least manager
 * @deprecated All users now have full access - always returns true for authenticated users
 */
export function isManager(userRole: string | null | undefined): boolean {
  return !!userRole;
}

/**
 * Check if user is at least agent (any authenticated user)
 */
export function isAgent(userRole: string | null | undefined): boolean {
  return !!userRole;
}

// Permission definitions - kept for reference only
export const PERMISSIONS = {
  // Client permissions
  CLIENTS_VIEW: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],
  CLIENTS_CREATE: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],
  CLIENTS_EDIT: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],
  CLIENTS_DELETE: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],

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
  QUOTAS_RESET: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],

  // Admin
  USERS_MANAGE: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],
  SETTINGS_MANAGE: ['ADMIN', 'MANAGER', 'AGENT'] as UserRole[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if user has a specific permission
 * @deprecated All users now have full access - always returns true for authenticated users
 */
export function hasPermission(userRole: string | null | undefined, _permission: Permission): boolean {
  // All authenticated users have all permissions
  return !!userRole;
}

/**
 * Get actual role level (for display purposes only)
 */
export function getRoleLevel(userRole: string | null | undefined): number {
  if (!userRole) return 0;
  return ROLE_HIERARCHY[userRole as UserRole] ?? 0;
}
