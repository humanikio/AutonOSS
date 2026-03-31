import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { UsersController } from '../controllers/usersController';

const router = Router();
const usersController = new UsersController();

// Apply authentication middleware
router.use(authenticateToken);

/**
 * GET /api/users/:tenantId/team
 * Get all team members for a tenant
 */
router.get('/:tenantId/team', usersController.getTeamUsers.bind(usersController));

/**
 * GET /api/users/:tenantId/user/:userId
 * Get individual user data (name, avatar, etc.)
 */
router.get('/:tenantId/user/:userId', usersController.getUserData.bind(usersController));

/**
 * POST /api/users/:tenantId/invite
 * Invite a new user to join the team
 * 
 * Body:
 * - email: string (required)
 * - name: string (required) 
 * - role: 'admin' | 'user' (required)
 * - subAccounts: string[] (optional) - Array of subaccount IDs
 * - hasMainAccountAccess: boolean (optional) - Grant access to main tenant account (default: false)
 */
router.post('/:tenantId/invite', usersController.inviteUser.bind(usersController));

/**
 * PUT /api/users/:tenantId/:userId/role
 * Update user role and permissions
 * 
 * Body:
 * - role: 'admin' | 'user' (required)
 * - subAccounts: string[] (optional)
 */
router.put('/:tenantId/:userId/role', usersController.updateUserRole.bind(usersController));

/**
 * PUT /api/users/:tenantId/:userId/status
 * Toggle user status (active/suspended)
 *
 * Body:
 * - status: 'active' | 'suspended' (required)
 */
router.put('/:tenantId/:userId/status', usersController.updateUserStatus.bind(usersController));

/**
 * PUT /api/users/:tenantId/profile
 * Update user profile (name, timezone, phone, avatar)
 *
 * Body:
 * - name: string (optional)
 * - timezone: string (optional) - IANA timezone
 * - phone: string (optional)
 * - avatarUrl: string (optional)
 */
router.put('/:tenantId/profile', usersController.updateUserProfile.bind(usersController));

/**
 * POST /api/users/:tenantId/:userId/subaccounts
 * Grant user access to subaccounts
 * 
 * Body:
 * - subAccountIds: string[] (required)
 */
router.post('/:tenantId/:userId/subaccounts', usersController.grantSubaccountAccess.bind(usersController));

/**
 * DELETE /api/users/:tenantId/:userId/subaccounts/:subAccountId
 * Revoke user access from specific subaccount
 */
router.delete('/:tenantId/:userId/subaccounts/:subAccountId', usersController.revokeSubaccountAccess.bind(usersController));

/**
 * DELETE /api/users/:tenantId/:userId
 * Remove user from team (soft delete)
 */
router.delete('/:tenantId/:userId', usersController.removeUser.bind(usersController));

/**
 * GET /api/users/:tenantId/subaccounts
 * Get all subaccounts for a tenant
 */
router.get('/:tenantId/subaccounts', usersController.getSubaccounts.bind(usersController));

/**
 * POST /api/users/:tenantId/subaccounts
 * Create a new subaccount
 * 
 * Body:
 * - name: string (required)
 * - description: string (optional)
 */
router.post('/:tenantId/subaccounts', usersController.createSubaccount.bind(usersController));

/**
 * PUT /api/users/:tenantId/subaccounts/:subAccountId
 * Update subaccount details
 * 
 * Body:
 * - name: string (optional)
 * - description: string (optional)
 * - status: 'active' | 'suspended' (optional)
 */
router.put('/:tenantId/subaccounts/:subAccountId', usersController.updateSubaccount.bind(usersController));

/**
 * DELETE /api/users/:tenantId/subaccounts/:subAccountId
 * Delete a subaccount
 */
router.delete('/:tenantId/subaccounts/:subAccountId', usersController.deleteSubaccount.bind(usersController));

/**
 * POST /api/users/switch-tenant
 * Switch user's selected tenant
 * 
 * Body:
 * - selectedTenantId: string (required)
 */
router.post('/switch-tenant', usersController.switchTenant.bind(usersController));

/**
 * GET /api/users/:tenantId/subaccounts/:subAccountId/debug
 * Debug: Get detailed info about who's in a subaccount's allowedUsers array
 */
router.get('/:tenantId/subaccounts/:subAccountId/debug', usersController.debugSubaccountUsers.bind(usersController));

export default router;