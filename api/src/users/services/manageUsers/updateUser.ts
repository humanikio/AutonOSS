import { db } from '../../../config/firestore';
import admin from 'firebase-admin';
import { getUsersService } from './getUsers';

export interface UpdateUserRoleRequest {
  tenantId: string;
  userId: string;
  role: 'admin' | 'user';
  subAccounts?: string[];
  hasMainAccountAccess?: boolean;  // NEW: Control access to main tenant account
  updatedBy: string;
}

export interface UpdateUserStatusRequest {
  tenantId: string;
  userId: string;
  status: 'active' | 'suspended';
  updatedBy: string;
}

export interface GrantSubaccountAccessRequest {
  tenantId: string;
  userId: string;
  subAccountIds: string[];
  grantedBy: string;
}

export interface RevokeSubaccountAccessRequest {
  tenantId: string;
  userId: string;
  subAccountId: string;
  revokedBy: string;
}

export interface UpdateSubaccountRequest {
  tenantId: string;
  subAccountId: string;
  name?: string;
  description?: string;
  status?: 'active' | 'suspended';
  updatedBy: string;
}

export interface SwitchSelectedTenantRequest {
  userId: string;
  selectedTenantId: string;
}

export interface UpdateUserRoleResponse {
  userId: string;
  role: 'admin' | 'user';
  accessibleTenants: string[];
}

export interface UpdateUserStatusResponse {
  userId: string;
  status: 'active' | 'suspended';
  updatedAt: string;
}

export interface GrantSubaccountAccessResponse {
  userId: string;
  grantedSubaccounts: string[];
  totalAccessibleTenants: number;
}

export interface UpdateSubaccountResponse {
  subTenantId: string;
  name: string;
  status: string;
  updatedAt: string;
}

export class UpdateUserService {

  /**
   * Update user role and permissions
   */
  async updateUserRole(request: UpdateUserRoleRequest): Promise<UpdateUserRoleResponse> {
    try {
      const { tenantId, userId, role, subAccounts, hasMainAccountAccess = false, updatedBy } = request;
      
      console.log(`= Updating user role: ${userId} to ${role}`);

      // Validate the requesting user has admin access
      const hasAccess = await getUsersService.validateUserAccess(updatedBy, tenantId, 'admin');
      if (!hasAccess) {
        throw new Error('Insufficient permissions to update user roles');
      }

      // Get the user being updated
      const userDoc = await db.doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new Error('User data not found');
      }
      
      // Don't allow changing owner role
      if (userData.role === 'owner') {
        throw new Error('Cannot modify owner role');
      }

      // Update user document
      const updateData: any = {
        role,
        updatedAt: new Date().toISOString()
      };

      // Update accessible tenants if subAccounts or hasMainAccountAccess is provided
      if (subAccounts !== undefined || hasMainAccountAccess !== undefined) {
        // Build accessibleTenants array based on explicit permissions
        const accessibleTenants: string[] = [];
        
        // Only add main tenant if explicitly granted access
        if (hasMainAccountAccess === true) {
          accessibleTenants.push(tenantId);
        }
        
        // Add all granted subaccounts
        if (subAccounts && subAccounts.length > 0) {
          accessibleTenants.push(...subAccounts);
        }
        
        // Validate that at least one account access is granted
        if (accessibleTenants.length === 0) {
          throw new Error('User must have access to at least one account (main account or subaccounts)');
        }
        
        updateData.accessibleTenants = accessibleTenants;

        // Update subaccount allowed users lists
        // First remove user from all current subaccounts
        const currentSubaccounts = userData.accessibleTenants?.filter((t: string) => t !== tenantId) || [];
        for (const subAccountId of currentSubaccounts) {
          try {
            await db.doc(`tenants/${tenantId}/subaccounts/${subAccountId}`).update({
              allowedUsers: admin.firestore.FieldValue.arrayRemove(userId)
            });
          } catch (error) {
            console.warn(`Failed to remove user from subaccount ${subAccountId}:`, error);
          }
        }

        // Add user to new subaccounts
        if (subAccounts && subAccounts.length > 0) {
          for (const subAccountId of subAccounts) {
            try {
              await db.doc(`tenants/${tenantId}/subaccounts/${subAccountId}`).update({
                allowedUsers: admin.firestore.FieldValue.arrayUnion(userId)
              });
            } catch (error) {
              console.warn(`Failed to add user to subaccount ${subAccountId}:`, error);
            }
          }
        }
        
        console.log(`✅ Updated user ${userId} accessibleTenants: [${accessibleTenants.join(', ')}]`);
      }

      await db.doc(`users/${userId}`).update(updateData);

      // Log the update
      await db.collection('auditLogs').add({
        tenantId,
        action: 'user_role_updated',
        performedBy: updatedBy,
        targetUserId: userId,
        details: {
          oldRole: userData.role,
          newRole: role,
          subAccounts: subAccounts || [],
          hasMainAccountAccess: hasMainAccountAccess,
          newAccessibleTenants: updateData.accessibleTenants || userData.accessibleTenants
        },
        timestamp: new Date().toISOString()
      });

      console.log(` User role updated successfully: ${userId}`);

      return {
        userId,
        role,
        accessibleTenants: updateData.accessibleTenants || userData.accessibleTenants || [tenantId]
      };

    } catch (error) {
      console.error('Error updating user role:', error);
      throw new Error(`Failed to update user role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user status (active/suspended)
   */
  async updateUserStatus(request: UpdateUserStatusRequest): Promise<UpdateUserStatusResponse> {
    try {
      const { tenantId, userId, status, updatedBy } = request;
      
      console.log(`= Updating user status: ${userId} to ${status}`);

      // Validate the requesting user has admin access
      const hasAccess = await getUsersService.validateUserAccess(updatedBy, tenantId, 'admin');
      if (!hasAccess) {
        throw new Error('Insufficient permissions to update user status');
      }

      // Get the user being updated
      const userDoc = await db.doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new Error('User data not found');
      }
      
      // Don't allow suspending owner
      if (userData.role === 'owner' && status === 'suspended') {
        throw new Error('Cannot suspend account owner');
      }

      const timestamp = new Date().toISOString();

      // Update user status
      await db.doc(`users/${userId}`).update({
        status,
        updatedAt: timestamp,
        ...(status === 'suspended' ? { suspendedAt: timestamp } : { suspendedAt: null })
      });

      // Log the update
      await db.collection('auditLogs').add({
        tenantId,
        action: 'user_status_updated',
        performedBy: updatedBy,
        targetUserId: userId,
        details: {
          oldStatus: userData.status || 'active',
          newStatus: status
        },
        timestamp
      });

      console.log(` User status updated successfully: ${userId} -> ${status}`);

      return {
        userId,
        status,
        updatedAt: timestamp
      };

    } catch (error) {
      console.error('Error updating user status:', error);
      throw new Error(`Failed to update user status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Grant user access to subaccounts
   */
  async grantSubaccountAccess(request: GrantSubaccountAccessRequest): Promise<GrantSubaccountAccessResponse> {
    try {
      const { tenantId, userId, subAccountIds, grantedBy } = request;
      
      console.log(`= Granting subaccount access to user: ${userId}`);

      // Validate the requesting user has admin access
      const hasAccess = await getUsersService.validateUserAccess(grantedBy, tenantId, 'admin');
      if (!hasAccess) {
        throw new Error('Insufficient permissions to grant subaccount access');
      }

      // Get user
      const userDoc = await db.doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new Error('User data not found');
      }
      const currentAccessibleTenants = userData.accessibleTenants || [userData.tenantId];

      // Add new subaccounts to accessible tenants
      const newAccessibleTenants = [...new Set([...currentAccessibleTenants, ...subAccountIds])];

      // Update user document
      await db.doc(`users/${userId}`).update({
        accessibleTenants: newAccessibleTenants,
        updatedAt: new Date().toISOString()
      });

      // Add user to subaccount allowed users lists
      const grantedSubaccounts = [];
      for (const subAccountId of subAccountIds) {
        try {
          await db.doc(`tenants/${tenantId}/subaccounts/${subAccountId}`).update({
            allowedUsers: admin.firestore.FieldValue.arrayUnion(userId)
          });
          grantedSubaccounts.push(subAccountId);
        } catch (error) {
          console.warn(`Failed to add user to subaccount ${subAccountId}:`, error);
        }
      }

      // Log the grant
      await db.collection('auditLogs').add({
        tenantId,
        action: 'subaccount_access_granted',
        performedBy: grantedBy,
        targetUserId: userId,
        details: {
          grantedSubaccounts
        },
        timestamp: new Date().toISOString()
      });

      console.log(` Subaccount access granted to user: ${userId}`);

      return {
        userId,
        grantedSubaccounts,
        totalAccessibleTenants: newAccessibleTenants.length
      };

    } catch (error) {
      console.error('Error granting subaccount access:', error);
      throw new Error(`Failed to grant subaccount access: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Revoke user access from specific subaccount
   */
  async revokeSubaccountAccess(request: RevokeSubaccountAccessRequest): Promise<{ success: boolean }> {
    try {
      const { tenantId, userId, subAccountId, revokedBy } = request;
      
      console.log(`=� Revoking subaccount access: ${subAccountId} from user: ${userId}`);

      // Validate the requesting user has admin access
      const hasAccess = await getUsersService.validateUserAccess(revokedBy, tenantId, 'admin');
      if (!hasAccess) {
        throw new Error('Insufficient permissions to revoke subaccount access');
      }

      // Get user
      const userDoc = await db.doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new Error('User data not found');
      }
      const currentAccessibleTenants = userData.accessibleTenants || [userData.tenantId];

      // Remove subaccount from accessible tenants
      const newAccessibleTenants = currentAccessibleTenants.filter((t: string) => t !== subAccountId);

      // Update user document
      await db.doc(`users/${userId}`).update({
        accessibleTenants: newAccessibleTenants,
        updatedAt: new Date().toISOString()
      });

      // Remove user from subaccount allowed users list
      await db.doc(`tenants/${tenantId}/subaccounts/${subAccountId}`).update({
        allowedUsers: admin.firestore.FieldValue.arrayRemove(userId)
      });

      // Log the revocation
      await db.collection('auditLogs').add({
        tenantId,
        action: 'subaccount_access_revoked',
        performedBy: revokedBy,
        targetUserId: userId,
        details: {
          revokedSubaccount: subAccountId
        },
        timestamp: new Date().toISOString()
      });

      console.log(` Subaccount access revoked from user: ${userId}`);

      return { success: true };

    } catch (error) {
      console.error('Error revoking subaccount access:', error);
      throw new Error(`Failed to revoke subaccount access: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update subaccount details
   */
  async updateSubaccount(request: UpdateSubaccountRequest): Promise<UpdateSubaccountResponse> {
    try {
      const { tenantId, subAccountId, name, description, status, updatedBy } = request;
      
      console.log(`= Updating subaccount: ${subAccountId}`);

      // Validate the requesting user has admin access
      const hasAccess = await getUsersService.validateUserAccess(updatedBy, tenantId, 'admin');
      if (!hasAccess) {
        throw new Error('Insufficient permissions to update subaccounts');
      }

      const timestamp = new Date().toISOString();
      const updateData: any = {
        updatedAt: timestamp
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;

      // Update subaccount management document
      await db.doc(`tenants/${tenantId}/subaccounts/${subAccountId}`).update(updateData);

      // Update subaccount tenant document if name changed
      if (name !== undefined) {
        await db.doc(`tenants/${subAccountId}`).update({
          name,
          updatedAt: timestamp
        });
      }

      // Log the update
      await db.collection('auditLogs').add({
        tenantId,
        action: 'subaccount_updated',
        performedBy: updatedBy,
        details: {
          subAccountId,
          updates: updateData
        },
        timestamp
      });

      console.log(` Subaccount updated successfully: ${subAccountId}`);

      return {
        subTenantId: subAccountId,
        name: name || 'Updated Subaccount',
        status: status || 'active',
        updatedAt: timestamp
      };

    } catch (error) {
      console.error('Error updating subaccount:', error);
      throw new Error(`Failed to update subaccount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Switch user's selected tenant
   */
  async switchSelectedTenant(request: SwitchSelectedTenantRequest): Promise<{ success: boolean; selectedTenant: string }> {
    try {
      const { userId, selectedTenantId } = request;
      
      console.log(`🔄 Switching selected tenant for user: ${userId} to: ${selectedTenantId}`);

      // Get user document to validate access
      const userDoc = await db.doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new Error('User data not found');
      }

      // Validate user has access to the selected tenant
      const accessibleTenants = userData.accessibleTenants || [];
      if (!accessibleTenants.includes(selectedTenantId)) {
        throw new Error('Access denied: User does not have access to selected tenant');
      }

      // Validate the tenant exists
      const tenantDoc = await db.doc(`tenants/${selectedTenantId}`).get();
      if (!tenantDoc.exists) {
        throw new Error('Selected tenant not found');
      }

      // Update user's selectedTenant field
      await db.doc(`users/${userId}`).update({
        selectedTenant: selectedTenantId,
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Successfully switched tenant for user: ${userId} to: ${selectedTenantId}`);

      return {
        success: true,
        selectedTenant: selectedTenantId
      };

    } catch (error) {
      console.error('Error switching selected tenant:', error);
      throw new Error(`Failed to switch tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const updateUserService = new UpdateUserService();