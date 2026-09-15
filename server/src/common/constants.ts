export const ROLES = ['poster', 'helper', 'both'] as const;
export type UserRole = (typeof ROLES)[number];
export const ADMIN_ROLES = ['owner', 'operations_admin', 'support_admin', 'finance_admin', 'read_only'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
