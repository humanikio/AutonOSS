import { User, Tenant } from '@/types';

/**
 * Role-based access control utilities
 */

export interface UserPermissions {
  canManageUsers: boolean;
  canEditCompanySettings: boolean;
  canAccessUsersSection: boolean;
  canInviteUsers: boolean;
  canRemoveUsers: boolean;
  canSuspendUsers: boolean;
  isRootUser: boolean;
  isAdmin: boolean;
}

/**
 * Check if user is the root user (owner where Firebase UID equals tenant ID)
 */
export const isRootUser = (user: User | null, tenant: Tenant | null): boolean => {
  if (!user || !tenant) return false;
  return user.uid === tenant.id;
};

/**
 * Check if user is an admin (has isAdmin flag or is root user)
 */
export const isAdminUser = (user: User | null, tenant: Tenant | null): boolean => {
  if (!user) return false;
  return isRootUser(user, tenant) || (user as any).isAdmin === true;
};

/**
 * Get comprehensive permissions for a user
 */
export const getUserPermissions = (user: User | null, tenant: Tenant | null): UserPermissions => {
  const isRoot = isRootUser(user, tenant);
  const isAdmin = isAdminUser(user, tenant);

  return {
    canManageUsers: isRoot || isAdmin,
    canEditCompanySettings: isRoot || isAdmin,
    canAccessUsersSection: isRoot || isAdmin,
    canInviteUsers: isRoot || isAdmin,
    canRemoveUsers: isRoot || isAdmin,
    canSuspendUsers: isRoot || isAdmin,
    isRootUser: isRoot,
    isAdmin: isAdmin
  };
};

/**
 * Get display role for user badge
 */
export const getUserDisplayRole = (user: User | null, tenant: Tenant | null): string => {
  if (!user) return 'User';
  
  if (isRootUser(user, tenant)) {
    return 'ROOT USER';
  }
  
  if ((user as any).isAdmin) {
    return 'Admin';
  }
  
  return 'User';
};

/**
 * Get role badge styling
 */
export const getRoleBadgeStyles = (user: User | null, tenant: Tenant | null): string => {
  if (isRootUser(user, tenant)) {
    return 'bg-yellow-100 text-yellow-800';
  }
  
  if ((user as any).isAdmin) {
    return 'bg-blue-100 text-blue-800';
  }
  
  return 'bg-gray-100 text-gray-800';
};

/**
 * Get role icon component name
 */
export const getRoleIcon = (user: User | null, tenant: Tenant | null): 'Crown' | 'Shield' | 'User' => {
  if (isRootUser(user, tenant)) {
    return 'Crown';
  }
  
  if ((user as any).isAdmin) {
    return 'Shield';
  }
  
  return 'User';
};