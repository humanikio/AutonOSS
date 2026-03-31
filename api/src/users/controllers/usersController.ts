import { Request, Response } from 'express';
import {
  getUsersService,
  createUserService,
  updateUserService,
  deleteUserService
} from '../services/manageUsers';
import { updateUserProfileService } from '../services/manageUsers/updateUserProfile';
import { APIResponse } from '../../types';
import { firestore } from '../../config/firebase';

export interface InviteUserRequest {
  email: string;
  name: string;
  role: 'admin' | 'user';
  subAccounts?: string[];
  hasMainAccountAccess?: boolean;
}

export interface UpdateUserRoleRequest {
  role: 'admin' | 'user';
  subAccounts?: string[];
  hasMainAccountAccess?: boolean;
}

export interface UpdateUserStatusRequest {
  status: 'active' | 'suspended';
}

export interface CreateSubaccountRequest {
  name: string;
  description?: string;
}

export interface UpdateSubaccountRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'suspended';
}

export interface GrantSubaccountAccessRequest {
  subAccountIds: string[];
}

export interface SwitchTenantRequest {
  selectedTenantId: string;
}

export class UsersController {

  /**
   * Get all team members for a tenant
   */
  async getTeamUsers(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const requestingUserId = req.user?.uid;

      console.log(`=� Getting team users for tenant: ${tenantId}`);

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: tenantId',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await getUsersService.getTeamUsers(tenantId, requestingUserId);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error getting team users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch team users',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Invite a new user to join the team
   */
  async inviteUser(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { email, name, role, subAccounts, hasMainAccountAccess } = req.body as InviteUserRequest;
      const invitedBy = req.user?.uid;

      console.log(`=K Inviting user to tenant: ${tenantId}`, { email, name, role });

      // Validation
      if (!tenantId || !email || !name || !role) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'tenantId, email, name, and role are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!['admin', 'user'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role',
          message: 'Role must be either "admin" or "user"',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await createUserService.inviteUser({
        tenantId,
        email,
        name,
        role,
        subAccounts: subAccounts || [],
        invitedBy: invitedBy!,
        hasMainAccountAccess: hasMainAccountAccess || false
      });

      res.status(201).json({
        success: true,
        data: result,
        message: `Invitation sent to ${email}`,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error inviting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to invite user',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update user role and permissions
   */
  async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = req.params;
      const { role, subAccounts, hasMainAccountAccess } = req.body as UpdateUserRoleRequest;
      const updatedBy = req.user?.uid;

      console.log(`= Updating user role: ${userId} in tenant: ${tenantId}`);

      if (!tenantId || !userId || !role) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'tenantId, userId, and role are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await updateUserService.updateUserRole({
        tenantId,
        userId,
        role,
        subAccounts,
        hasMainAccountAccess,
        updatedBy: updatedBy!
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'User role updated successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user role',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update user status (active/suspended)
   */
  async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = req.params;
      const { status } = req.body as UpdateUserStatusRequest;
      const updatedBy = req.user?.uid;

      console.log(`= Updating user status: ${userId} to ${status}`);

      if (!tenantId || !userId || !status) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'tenantId, userId, and status are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!['active', 'suspended'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: 'Status must be either "active" or "suspended"',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await updateUserService.updateUserStatus({
        tenantId,
        userId,
        status,
        updatedBy: updatedBy!
      });

      res.status(200).json({
        success: true,
        data: result,
        message: `User ${status === 'active' ? 'activated' : 'suspended'} successfully`,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Grant user access to subaccounts
   */
  async grantSubaccountAccess(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = req.params;
      const { subAccountIds } = req.body as GrantSubaccountAccessRequest;
      const grantedBy = req.user?.uid;

      console.log(`= Granting subaccount access to user: ${userId}`);

      if (!tenantId || !userId || !subAccountIds || !Array.isArray(subAccountIds)) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'tenantId, userId, and subAccountIds array are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await updateUserService.grantSubaccountAccess({
        tenantId,
        userId,
        subAccountIds,
        grantedBy: grantedBy!
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Subaccount access granted successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error granting subaccount access:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to grant subaccount access',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Revoke user access from specific subaccount
   */
  async revokeSubaccountAccess(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, userId, subAccountId } = req.params;
      const revokedBy = req.user?.uid;

      console.log(`=� Revoking subaccount access: ${subAccountId} from user: ${userId}`);

      if (!tenantId || !userId || !subAccountId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'tenantId, userId, and subAccountId are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await updateUserService.revokeSubaccountAccess({
        tenantId,
        userId,
        subAccountId,
        revokedBy: revokedBy!
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Subaccount access revoked successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error revoking subaccount access:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke subaccount access',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Remove user from team
   */
  async removeUser(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = req.params;
      const removedBy = req.user?.uid;

      console.log(`=� Removing user: ${userId} from tenant: ${tenantId}`);

      if (!tenantId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'tenantId and userId are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await deleteUserService.removeUser({
        tenantId,
        userId,
        removedBy: removedBy!
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'User removed successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error removing user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove user',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get all subaccounts for a tenant
   */
  async getSubaccounts(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const requestingUserId = req.user?.uid;

      console.log(`=� Getting subaccounts for tenant: ${tenantId}`);

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: tenantId',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await getUsersService.getSubaccounts(tenantId, requestingUserId);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error getting subaccounts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subaccounts',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create a new subaccount
   */
  async createSubaccount(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { name, description } = req.body as CreateSubaccountRequest;
      const createdBy = req.user?.uid;

      console.log(`<� Creating subaccount: ${name} for tenant: ${tenantId}`);

      if (!tenantId || !name) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'tenantId and name are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await createUserService.createSubaccount({
        tenantId,
        name,
        description,
        createdBy: createdBy!
      });

      res.status(201).json({
        success: true,
        data: result,
        message: `Subaccount "${name}" created successfully`,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error creating subaccount:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create subaccount',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update subaccount details
   */
  async updateSubaccount(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, subAccountId } = req.params;
      const { name, description, status } = req.body as UpdateSubaccountRequest;
      const updatedBy = req.user?.uid;

      console.log(`= Updating subaccount: ${subAccountId}`);

      if (!tenantId || !subAccountId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'tenantId and subAccountId are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await updateUserService.updateSubaccount({
        tenantId,
        subAccountId,
        name,
        description,
        status,
        updatedBy: updatedBy!
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Subaccount updated successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error updating subaccount:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update subaccount',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete a subaccount
   */
  async deleteSubaccount(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, subAccountId } = req.params;
      const deletedBy = req.user?.uid;

      console.log(`=� Deleting subaccount: ${subAccountId}`);

      if (!tenantId || !subAccountId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'tenantId and subAccountId are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await deleteUserService.deleteSubaccount({
        tenantId,
        subAccountId,
        deletedBy: deletedBy!
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Subaccount deleted successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error deleting subaccount:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete subaccount',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Switch user's selected tenant
   */
  async switchTenant(req: Request, res: Response): Promise<void> {
    try {
      const { selectedTenantId } = req.body as SwitchTenantRequest;
      const userId = req.user?.uid;

      console.log(`🔄 Switching tenant for user: ${userId} to: ${selectedTenantId}`);

      if (!selectedTenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'selectedTenantId is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await updateUserService.switchSelectedTenant({
        userId,
        selectedTenantId
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Tenant switched successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error switching tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to switch tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Debug: Get detailed info about subaccount users
   */
  async debugSubaccountUsers(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, subAccountId } = req.params;

      console.log(`🔍 Debug subaccount users: ${subAccountId} in tenant: ${tenantId}`);

      // Get subaccount document
      const { db } = require('../../../config/firestore');
      const subaccountDoc = await db.doc(`tenants/${tenantId}/subaccounts/${subAccountId}`).get();

      if (!subaccountDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'Subaccount not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const subaccountData = subaccountDoc.data();
      const allowedUsers = subaccountData?.allowedUsers || [];

      // Get actual user documents for each ID in allowedUsers
      const userDetails = [];
      for (const uid of allowedUsers) {
        try {
          const userDoc = await db.doc(`users/${uid}`).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userDetails.push({
              uid,
              email: userData?.email,
              name: userData?.name,
              status: userData?.status || 'active',
              hasAccess: userData?.accessibleTenants?.includes(subAccountId) || false,
              exists: true
            });
          } else {
            userDetails.push({
              uid,
              email: 'Unknown',
              name: 'User document not found',
              status: 'missing',
              hasAccess: false,
              exists: false
            });
          }
        } catch (error) {
          userDetails.push({
            uid,
            email: 'Error',
            name: `Error: ${error}`,
            status: 'error',
            hasAccess: false,
            exists: false
          });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          subAccountId,
          subAccountName: subaccountData?.name,
          allowedUsersCount: allowedUsers.length,
          allowedUserIds: allowedUsers,
          userDetails,
          summary: {
            activeUsers: userDetails.filter(u => u.exists && u.status === 'active').length,
            missingUsers: userDetails.filter(u => !u.exists).length,
            usersWithAccess: userDetails.filter(u => u.hasAccess).length
          }
        },
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error debugging subaccount users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to debug subaccount users',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get individual user data for chat avatars
   */
  async getUserData(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = req.params;
      const requestingUser = (req as any).user;

      console.log(`🔍 Get user data: ${userId} for tenant: ${tenantId}`);

      // Basic authorization - user should have access to the tenant
      if (!requestingUser?.tenantId || 
          (requestingUser.tenantId !== tenantId && 
           !requestingUser.accessibleTenants?.includes(tenantId))) {
        res.status(403).json({
          success: false,
          error: 'Access denied to tenant',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userDoc = await firestore.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userData = userDoc.data();
      
      // Return only necessary data for chat interface
      res.status(200).json({
        success: true,
        data: {
          uid: userId,
          name: userData?.name,
          email: userData?.email,
          avatarUrl: userData?.avatarUrl,
          initials: userData?.name ? 
            userData.name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().slice(0, 2) :
            (userData?.email ? userData.email.split('@')[0].charAt(0).toUpperCase() : 'U')
        },
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error getting user data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update user profile (name, timezone, phone, avatar)
   */
  async updateUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { name, timezone, phone, avatarUrl } = req.body;
      const userId = (req as any).user.uid; // From authenticateToken middleware

      const result = await updateUserProfileService.updateUserProfile({
        userId,
        name,
        timezone,
        phone,
        avatarUrl
      });

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
        timestamp: new Date().toISOString()
      });
    }
  }
}