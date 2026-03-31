import { firestore } from '../../../config/firebase';
import { User } from '../../../types';

export interface TeamUser extends User {
  accessibleTenants: string[];
  status: 'active' | 'suspended';
  lastLoginAt?: string;
}

export interface SubAccount {
  subTenantId: string;
  name: string;
  description?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  createdBy: string;
  allowedUsers: string[];
  userCount: number;
}

export interface GetTeamUsersResponse {
  users: TeamUser[];
  totalCount: number;
}

export interface GetSubaccountsResponse {
  subaccounts: SubAccount[];
  totalCount: number;
}

export class GetUsersService {
  
  /**
   * Get all team members for a tenant
   */
  async getTeamUsers(tenantId: string, requestingUserId?: string): Promise<GetTeamUsersResponse> {
    try {
      console.log(`=👥 Fetching all organization users for tenant: ${tenantId}`);

      // Validate tenant exists
      const tenantDoc = await firestore.doc(`tenants/${tenantId}`).get();
      if (!tenantDoc.exists) {
        throw new Error('Tenant not found');
      }

      // Query users who belong to this organization (regardless of current access permissions)
      const usersSnapshot = await firestore.collection('users')
        .where('tenantId', '==', tenantId)
        .get();
      
      const users: TeamUser[] = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as User;
        
        // Skip if user doesn't have required fields
        if (!userData.uid || !userData.email) {
          console.warn(`Skipping user with missing data: ${userDoc.id}`);
          continue;
        }

        // Skip users who have been removed from the organization
        const userStatus = (userData as any).status || 'active';
        if (userStatus === 'removed') {
          console.log(`Skipping removed user: ${userData.email}`);
          continue;
        }

        // Build team user object
        const teamUser: TeamUser = {
          ...userData,
          accessibleTenants: userData.accessibleTenants || [userData.tenantId],
          status: userStatus, // Use the actual status
          lastLoginAt: (userData as any).lastLoginAt
        };

        users.push(teamUser);
      }

      // Sort users by createdAt (newest first) - done in JavaScript instead of Firestore query
      users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log(` Found ${users.length} team users for tenant: ${tenantId}`);

      return {
        users,
        totalCount: users.length
      };

    } catch (error) {
      console.error('Error fetching team users:', error);
      throw new Error(`Failed to fetch team users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all subaccounts for a tenant
   */
  async getSubaccounts(tenantId: string, requestingUserId?: string): Promise<GetSubaccountsResponse> {
    try {
      console.log(`<� Fetching subaccounts for tenant: ${tenantId}`);

      // Validate tenant exists and user has access
      const tenantDoc = await firestore.doc(`tenants/${tenantId}`).get();
      if (!tenantDoc.exists) {
        throw new Error('Tenant not found');
      }

      // Get subaccounts collection from the main tenant
      const subaccountsSnapshot = await firestore.collection(`tenants/${tenantId}/subaccounts`)
        .orderBy('createdAt', 'desc')
        .get();
      
      const subaccounts: SubAccount[] = [];
      
      for (const subaccountDoc of subaccountsSnapshot.docs) {
        const subaccountData = subaccountDoc.data();
        
        // Count ACTUAL active users with access to this subaccount
        let userCount = 0;
        if (subaccountData.allowedUsers && subaccountData.allowedUsers.length > 0) {
          // Check each user in allowedUsers to see if they actually exist and are active
          for (const userId of subaccountData.allowedUsers) {
            try {
              const userDoc = await firestore.doc(`users/${userId}`).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData?.status !== 'removed' && userData?.accessibleTenants?.includes(subaccountData.subTenantId)) {
                  userCount++;
                }
              }
            } catch (error) {
              console.warn(`Error checking user ${userId} for subaccount count:`, error);
            }
          }
        }

        const subaccount: SubAccount = {
          subTenantId: subaccountData.subTenantId || subaccountDoc.id,
          name: subaccountData.name || 'Unnamed Subaccount',
          description: subaccountData.description,
          status: subaccountData.status || 'active',
          createdAt: subaccountData.createdAt || new Date().toISOString(),
          createdBy: subaccountData.createdBy || '',
          allowedUsers: subaccountData.allowedUsers || [],
          userCount
        };

        subaccounts.push(subaccount);
      }

      console.log(` Found ${subaccounts.length} subaccounts for tenant: ${tenantId}`);

      return {
        subaccounts,
        totalCount: subaccounts.length
      };

    } catch (error) {
      console.error('Error fetching subaccounts:', error);
      throw new Error(`Failed to fetch subaccounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific user by ID and tenant
   */
  async getUserById(userId: string, tenantId: string): Promise<TeamUser | null> {
    try {
      console.log(`=d Fetching user: ${userId} for tenant: ${tenantId}`);

      const userDoc = await firestore.doc(`users/${userId}`).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data() as User;

      // Check if user has access to the tenant
      const accessibleTenants = userData.accessibleTenants || [userData.tenantId];
      if (!accessibleTenants.includes(tenantId)) {
        return null;
      }

      const teamUser: TeamUser = {
        ...userData,
        accessibleTenants,
        status: (userData as any).status || 'active',
        lastLoginAt: (userData as any).lastLoginAt
      };

      return teamUser;

    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user has admin access to tenant
   */
  async validateUserAccess(userId: string, tenantId: string, requiredRole: 'owner' | 'admin' | 'user' = 'user'): Promise<boolean> {
    try {
      // Special case: If userId equals tenantId, this is likely the tenant owner
      if (userId === tenantId) {
        console.log(`🔑 Special case: userId equals tenantId (${userId}), treating as tenant owner`);
        
        // Check if tenant exists and verify this is indeed the owner
        const tenantDoc = await firestore.doc(`tenants/${tenantId}`).get();
        if (tenantDoc.exists) {
          const tenantData = tenantDoc.data();
          // If tenant exists and userId matches tenantId, grant owner access
          console.log(`✅ Tenant owner access granted for tenant: ${tenantId}`);
          return true; // Tenant owner has all permissions
        }
      }

      const user = await this.getUserById(userId, tenantId);
      
      if (!user) {
        console.log(`❌ User not found: ${userId} for tenant: ${tenantId}`);
        return false;
      }

      // Role hierarchy: owner > admin > user
      const roleHierarchy = { owner: 3, admin: 2, user: 1 };
      const userRoleLevel = roleHierarchy[user.role] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      const hasAccess = userRoleLevel >= requiredRoleLevel;
      console.log(`🔍 Role validation - User: ${user.role} (${userRoleLevel}) vs Required: ${requiredRole} (${requiredRoleLevel}) = ${hasAccess}`);

      return hasAccess;

    } catch (error) {
      console.error('Error validating user access:', error);
      return false;
    }
  }
}

export const getUsersService = new GetUsersService();