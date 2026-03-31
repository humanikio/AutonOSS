import { db } from '../../../config/firestore';
import admin from 'firebase-admin';
import { adminAuth } from '../../../config/firebase';
import { getUsersService } from './getUsers';

export interface RemoveUserRequest {
  tenantId: string;
  userId: string;
  removedBy: string;
}

export interface DeleteSubaccountRequest {
  tenantId: string;
  subAccountId: string;
  deletedBy: string;
}

export interface RemoveUserResponse {
  userId: string;
  removed: boolean;
  removedAt: string;
}

export interface DeleteSubaccountResponse {
  subTenantId: string;
  deleted: boolean;
  deletedAt: string;
}

export class DeleteUserService {

  /**
   * Remove user from team (soft delete)
   */
  async removeUser(request: RemoveUserRequest): Promise<RemoveUserResponse> {
    try {
      const { tenantId, userId, removedBy } = request;
      
      console.log(`=� Removing user: ${userId} from tenant: ${tenantId}`);

      // Validate the requesting user has admin access
      const hasAccess = await getUsersService.validateUserAccess(removedBy, tenantId, 'admin');
      if (!hasAccess) {
        throw new Error('Insufficient permissions to remove users');
      }

      // Get the user being removed
      const userDoc = await db.doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new Error('User data not found');
      }
      
      // Don't allow removing the owner
      if (userData.role === 'owner') {
        throw new Error('Cannot remove account owner');
      }

      // Don't allow users to remove themselves
      if (userId === removedBy) {
        throw new Error('Cannot remove yourself');
      }

      const timestamp = new Date().toISOString();

      // Get user's accessible tenants to clean up subaccounts
      const currentAccessibleTenants = userData.accessibleTenants || [userData.tenantId];
      
      // Remove user from all subaccounts
      for (const accessibleTenantId of currentAccessibleTenants) {
        if (accessibleTenantId !== tenantId) { // Skip main tenant
          try {
            await db.doc(`tenants/${tenantId}/subaccounts/${accessibleTenantId}`).update({
              allowedUsers: admin.firestore.FieldValue.arrayRemove(userId)
            });
          } catch (error) {
            console.warn(`Failed to remove user from subaccount ${accessibleTenantId}:`, error);
          }
        }
      }

      // 1. Remove user from tenant's user document
      try {
        await db.doc(`tenants/${tenantId}/users/${userId}`).delete();
        console.log(`✅ Deleted tenant user document: tenants/${tenantId}/users/${userId}`);
      } catch (error) {
        console.warn(`Failed to delete tenant user document: ${error}`);
      }

      // 2. Check if user belongs to this organization or just has access to it
      const userBelongsToThisOrg = userData.tenantId === tenantId;
      
      if (userBelongsToThisOrg) {
        // This user BELONGS to this organization - full removal
        console.log(`User belongs to this organization - performing full removal`);
        
        // 3. Delete Firebase Auth account
        try {
          await adminAuth.deleteUser(userId);
          console.log(`✅ Deleted Firebase Auth account for user: ${userId}`);
        } catch (error: any) {
          // Continue even if auth deletion fails (user might already be deleted)
          console.warn(`Failed to delete Firebase Auth account: ${error.message}`);
        }
        
        // 4. Delete the main user document
        await db.doc(`users/${userId}`).delete();
        console.log(`✅ Deleted user document: users/${userId}`);
      } else {
        // This user belongs to another organization but had access to this one - just remove access
        console.log(`User belongs to another organization - removing access only`);
        
        const updatedAccessibleTenants = currentAccessibleTenants.filter((t: string) => t !== tenantId);
        await db.doc(`users/${userId}`).update({
          accessibleTenants: updatedAccessibleTenants,
          updatedAt: timestamp
        });
        console.log(`✅ Removed tenant ${tenantId} from user's accessible tenants`);
      }

      // Log the removal
      await db.collection('auditLogs').add({
        tenantId,
        action: 'user_removed',
        performedBy: removedBy,
        targetUserId: userId,
        details: {
          userEmail: userData.email,
          userName: userData.name,
          userRole: userData.role,
          accessibleTenants: currentAccessibleTenants
        },
        timestamp
      });

      console.log(` User removed successfully: ${userId}`);

      return {
        userId,
        removed: true,
        removedAt: timestamp
      };

    } catch (error) {
      console.error('Error removing user:', error);
      throw new Error(`Failed to remove user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a subaccount and all its data
   */
  async deleteSubaccount(request: DeleteSubaccountRequest): Promise<DeleteSubaccountResponse> {
    try {
      const { tenantId, subAccountId, deletedBy } = request;
      
      console.log(`=� Deleting subaccount: ${subAccountId}`);

      // Validate the requesting user has admin access
      const hasAccess = await getUsersService.validateUserAccess(deletedBy, tenantId, 'admin');
      if (!hasAccess) {
        throw new Error('Insufficient permissions to delete subaccounts');
      }

      // Get subaccount info
      const subaccountDoc = await db.doc(`tenants/${tenantId}/subaccounts/${subAccountId}`).get();
      if (!subaccountDoc.exists) {
        throw new Error('Subaccount not found');
      }

      const subaccountData = subaccountDoc.data();
      if (!subaccountData) {
        throw new Error('Subaccount data not found');
      }
      const timestamp = new Date().toISOString();

      // Remove subaccount access from all users
      const allowedUsers = subaccountData.allowedUsers || [];
      for (const userId of allowedUsers) {
        try {
          const userDoc = await db.doc(`users/${userId}`).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (!userData) {
              console.warn(`User data not found for user ${userId}`);
              continue;
            }
            const currentAccessibleTenants = userData.accessibleTenants || [userData.tenantId];
            const newAccessibleTenants = currentAccessibleTenants.filter((t: string) => t !== subAccountId);
            
            await db.doc(`users/${userId}`).update({
              accessibleTenants: newAccessibleTenants,
              updatedAt: timestamp
            });
          }
        } catch (error) {
          console.warn(`Failed to remove subaccount access from user ${userId}:`, error);
        }
      }

      // TODO: In a production environment, you might want to:
      // 1. Move all subaccount data to an archive
      // 2. Notify users who had access
      // 3. Handle any ongoing processes/workflows

      // Delete the subaccount tenant document
      try {
        await db.doc(`tenants/${subAccountId}`).delete();
      } catch (error) {
        console.warn(`Failed to delete subaccount tenant document: ${subAccountId}`, error);
      }

      // Delete the subaccount management document
      await db.doc(`tenants/${tenantId}/subaccounts/${subAccountId}`).delete();

      // Log the deletion
      await db.collection('auditLogs').add({
        tenantId,
        action: 'subaccount_deleted',
        performedBy: deletedBy,
        details: {
          subAccountId,
          subaccountName: subaccountData.name,
          affectedUsers: allowedUsers,
          deletedData: {
            name: subaccountData.name,
            createdAt: subaccountData.createdAt,
            userCount: allowedUsers.length
          }
        },
        timestamp
      });

      console.log(` Subaccount deleted successfully: ${subAccountId}`);

      return {
        subTenantId: subAccountId,
        deleted: true,
        deletedAt: timestamp
      };

    } catch (error) {
      console.error('Error deleting subaccount:', error);
      throw new Error(`Failed to delete subaccount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk remove users from a tenant
   */
  async bulkRemoveUsers(tenantId: string, userIds: string[], removedBy: string): Promise<{
    success: string[];
    failed: Array<{ userId: string; error: string }>;
  }> {
    try {
      console.log(`=� Bulk removing ${userIds.length} users from tenant: ${tenantId}`);

      const success: string[] = [];
      const failed: Array<{ userId: string; error: string }> = [];

      for (const userId of userIds) {
        try {
          await this.removeUser({ tenantId, userId, removedBy });
          success.push(userId);
        } catch (error) {
          failed.push({
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(` Bulk removal completed: ${success.length} success, ${failed.length} failed`);

      return { success, failed };

    } catch (error) {
      console.error('Error in bulk remove users:', error);
      throw new Error(`Failed to bulk remove users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up orphaned user data (maintenance function)
   */
  async cleanupOrphanedData(tenantId: string, performedBy: string): Promise<{
    cleanedUsers: number;
    cleanedSubaccounts: number;
  }> {
    try {
      console.log(`>� Cleaning up orphaned data for tenant: ${tenantId}`);

      // Find users with removed status older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const usersQuery = db.collection('users')
        .where('status', '==', 'removed')
        .where('removedAt', '<', thirtyDaysAgo);

      const usersSnapshot = await usersQuery.get();
      let cleanedUsers = 0;

      for (const userDoc of usersSnapshot.docs) {
        try {
          await db.doc(`users/${userDoc.id}`).delete();
          cleanedUsers++;
        } catch (error) {
          console.warn(`Failed to delete orphaned user ${userDoc.id}:`, error);
        }
      }

      // Log cleanup
      await db.collection('auditLogs').add({
        tenantId,
        action: 'data_cleanup',
        performedBy,
        details: {
          cleanedUsers,
          cleanedSubaccounts: 0 // Could implement subaccount cleanup too
        },
        timestamp: new Date().toISOString()
      });

      console.log(` Data cleanup completed: ${cleanedUsers} users cleaned`);

      return {
        cleanedUsers,
        cleanedSubaccounts: 0
      };

    } catch (error) {
      console.error('Error cleaning up orphaned data:', error);
      throw new Error(`Failed to cleanup data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const deleteUserService = new DeleteUserService();