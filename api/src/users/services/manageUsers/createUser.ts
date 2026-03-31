import { db } from '../../../config/firestore';
import admin from 'firebase-admin';
import { User, Tenant } from '../../../types';
import { v4 as uuidv4 } from 'uuid';
import { getUsersService } from './getUsers';
import { emailTemplateService } from '../emailTemplateService';

export interface InviteUserRequest {
  tenantId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  subAccounts: string[];
  invitedBy: string;
  hasMainAccountAccess?: boolean;  // NEW: Control access to main tenant account
}

export interface CreateSubaccountRequest {
  tenantId: string;
  name: string;
  description?: string;
  createdBy: string;
}

export interface InviteUserResponse {
  invitationId: string;
  email: string;
  status: 'invited';
  inviteUrl?: string;
}

export interface CreateSubaccountResponse {
  subTenantId: string;
  name: string;
  status: 'active';
  createdAt: string;
}

export class CreateUserService {

  /**
   * Invite a new user to join the team
   */
  async inviteUser(request: InviteUserRequest): Promise<InviteUserResponse> {
    try {
      const { tenantId, email, name, role, subAccounts, invitedBy, hasMainAccountAccess = false } = request;
      
      console.log(`✉️ Inviting user: ${email} to tenant: ${tenantId}`);

      // Validate the requesting user has admin access
      const hasAccess = await getUsersService.validateUserAccess(invitedBy, tenantId, 'admin');
      if (!hasAccess) {
        throw new Error('Insufficient permissions to invite users');
      }

      // Check if tenant exists
      const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
      if (!tenantDoc.exists) {
        throw new Error('Tenant not found');
      }

      // Check if user already exists with this email
      // Note: In a real implementation, you'd query by email
      // For now, we'll create a pending invitation

      // Validate subAccounts exist if provided
      if (subAccounts && subAccounts.length > 0) {
        for (const subAccountId of subAccounts) {
          const subAccountDoc = await db.doc(`tenants/${tenantId}/subaccounts/${subAccountId}`).get();
          if (!subAccountDoc.exists) {
            throw new Error(`Subaccount ${subAccountId} not found`);
          }
        }
      }

      // Validate that at least one account access is granted
      if (!hasMainAccountAccess && (!subAccounts || subAccounts.length === 0)) {
        throw new Error('User must have access to at least one account (main account or subaccounts)');
      }

      // Generate invitation ID
      const invitationId = uuidv4();
      const inviteUrl = `${process.env.FRONTEND_URL}/invite/${invitationId}`;

      // Create invitation document
      const invitationData = {
        id: invitationId,
        tenantId,
        email,
        name,
        role,
        subAccounts: subAccounts || [],
        hasMainAccountAccess,  // Store main account access flag
        status: 'pending',
        invitedBy,
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        inviteUrl
      };

      await db.doc(`invitations/${invitationId}`).set(invitationData);

      // Get tenant and inviter information for email template
      const tenantData = tenantDoc.data();
      const inviterDoc = await db.doc(`users/${invitedBy}`).get();
      const inviterData = inviterDoc.exists ? inviterDoc.data() : null;

      // Send invitation email
      try {
        const emailResult = await emailTemplateService.sendInvitationEmail({
          inviteeName: name,
          inviteeEmail: email,
          inviterName: inviterData?.name || 'Admin',
          inviterEmail: inviterData?.email || 'admin@company.com',
          companyName: tenantData?.settings?.branding?.companyName || tenantData?.name || 'Company',
          role,
          inviteUrl,
          expiresAt: invitationData.expiresAt,
          subAccountCount: subAccounts?.length || 0
        });

        if (emailResult.success) {
          console.log(`✅ Invitation email sent successfully to: ${email}`);
        } else {
          console.warn(`⚠️  Invitation created but email failed to send: ${emailResult.error}`);
        }
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
      }

      // Log the invitation
      await db.collection('auditLogs').add({
        tenantId,
        action: 'user_invited',
        performedBy: invitedBy,
        details: {
          invitedEmail: email,
          invitedName: name,
          role,
          subAccounts
        },
        timestamp: new Date().toISOString()
      });

      console.log(`✅ User invitation created successfully: ${invitationId}`);

      return {
        invitationId,
        email,
        status: 'invited',
        inviteUrl
      };

    } catch (error) {
      console.error('Error inviting user:', error);
      throw new Error(`Failed to invite user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new subaccount
   */
  async createSubaccount(request: CreateSubaccountRequest): Promise<CreateSubaccountResponse> {
    try {
      const { tenantId, name, description, createdBy } = request;
      
      console.log(`🏢 Creating subaccount: ${name} for tenant: ${tenantId}`);

      // Validate the requesting user has admin access
      const hasAccess = await getUsersService.validateUserAccess(createdBy, tenantId, 'admin');
      if (!hasAccess) {
        throw new Error('Insufficient permissions to create subaccounts');
      }

      // Check if main tenant exists
      const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
      if (!tenantDoc.exists) {
        throw new Error('Parent tenant not found');
      }

      // Generate unique subaccount tenant ID
      const subTenantId = `sub-${uuidv4()}`;
      const timestamp = new Date().toISOString();

      // Create the subaccount tenant document
      const subAccountTenantData: Partial<Tenant> = {
        id: subTenantId,
        name,
        isSubAccount: true,
        parentTenantId: tenantId,
        plan: 'pro', // Inherits from parent or set default
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
        settings: {
          webhooks: {},
          apiKeys: {},
          branding: {
            companyName: name,
          },
          features: {
            smsEnabled: true,
            callsEnabled: true,
            maxAgents: 10,
            maxContacts: 5000
          }
        },
        usage: {
          smsCount: 0,
          callMinutes: 0,
          agentCount: 0,
          contactCount: 0,
          lastReset: timestamp
        }
      };

      await db.doc(`tenants/${subTenantId}`).set(subAccountTenantData);

      // Create subaccount management document in parent tenant
      const subAccountManagementData = {
        subTenantId,
        name,
        description: description || '',
        status: 'active',
        createdAt: timestamp,
        createdBy,
        allowedUsers: [tenantId], // Root user (tenantId) gets automatic access
        metadata: {
          description,
          settings: {}
        }
      };

      await db.doc(`tenants/${tenantId}/subaccounts/${subTenantId}`).set( 
        subAccountManagementData
      );

      // IMPORTANT: Add the new subaccount to the root user's accessibleTenants
      const rootUserDoc = await db.doc(`users/${tenantId}`).get();
      if (rootUserDoc.exists) {
        const rootUserData = rootUserDoc.data();
        const currentAccessibleTenants = rootUserData?.accessibleTenants || [];
        
        // Add new subaccount to root user's accessible tenants if not already present
        if (!currentAccessibleTenants.includes(subTenantId)) {
          const updatedAccessibleTenants = [...currentAccessibleTenants, subTenantId];
          
          await db.doc(`users/${tenantId}`).update({
            accessibleTenants: updatedAccessibleTenants,
            updatedAt: timestamp
          });
          
          console.log(`✅ Added subaccount ${subTenantId} to root user ${tenantId} accessibleTenants`);
        }
      } else {
        console.warn(`⚠️  Root user document not found: users/${tenantId}`);
      }

      // Log the creation
      await db.collection('auditLogs').add({
        tenantId,
        action: 'subaccount_created',
        performedBy: createdBy,
        details: {
          subTenantId,
          name,
          description
        },
        timestamp
      });

      console.log(`✅ Subaccount created successfully: ${subTenantId}`);

      return {
        subTenantId,
        name,
        status: 'active',
        createdAt: timestamp
      };

    } catch (error) {
      console.error('Error creating subaccount:', error);
      throw new Error(`Failed to create subaccount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Accept a user invitation and create the user account
   */
  async acceptInvitation(invitationId: string, userData: {
    uid: string;
    email: string;
    name: string;
  }): Promise<User> {
    try {
      console.log(`🤝 Accepting invitation: ${invitationId}`);

      // Get invitation document
      const invitationDoc = await db.doc(`invitations/${invitationId}`).get();
      if (!invitationDoc.exists) {
        throw new Error('Invitation not found or expired');
      }

      const invitationData = invitationDoc.data();
      if (!invitationData) {
        throw new Error('Invitation data not found');
      }
      
      // Check if invitation is still valid
      if (invitationData.status !== 'pending') {
        throw new Error('Invitation already used or expired');
      }

      if (new Date(invitationData.expiresAt) < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Create user document with proper access control
      const accessibleTenants: string[] = [];
      
      // Only add main tenant if explicitly granted access
      if (invitationData.hasMainAccountAccess === true) {
        accessibleTenants.push(invitationData.tenantId);
      }
      
      // Add all granted subaccounts
      if (invitationData.subAccounts && invitationData.subAccounts.length > 0) {
        accessibleTenants.push(...invitationData.subAccounts);
      }
      
      // Determine the default selected tenant using smart logic
      let selectedTenant: string;
      
      if (invitationData.hasMainAccountAccess === true) {
        selectedTenant = invitationData.tenantId; // Use main tenant if they have access
      } else {
        selectedTenant = accessibleTenants[0]; // Use first accessible subaccount
      }
      
      const newUser: User = {
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        tenantId: invitationData.tenantId, // Keep for reference (ROOT tenant)
        role: invitationData.role,
        permissions: [], // Will be set based on role
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        accessibleTenants,
        selectedTenant, // NEW: Current selected tenant for the user
        status: 'active',
        onboardingCompleted: true, // Invited users skip main tenant onboarding
        invitedUserOnboardingComplete: false, // NEW: Invited users need to complete profile onboarding
        // Add isAdmin flag for admin users
        ...(invitationData.role === 'admin' && { isAdmin: true })
      };

      await db.doc(`users/${userData.uid}`).set(newUser);

      // Create tenant-specific user document for management purposes
      const tenantUserData = {
        userId: userData.uid,
        email: userData.email,
        name: userData.name,
        role: invitationData.role,
        accessibleSubaccounts: invitationData.subAccounts || [],
        status: 'active',
        joinedAt: new Date().toISOString(),
        invitationId: invitationId,
        invitedBy: invitationData.invitedBy,
        permissions: [], // Will be set based on role
        lastLoginAt: null,
        // Add isAdmin flag for admin users
        ...(invitationData.role === 'admin' && { isAdmin: true }),
        metadata: {
          source: 'invitation',
          acceptedAt: new Date().toISOString()
        }
      };

      await db.doc(`tenants/${invitationData.tenantId}/users/${userData.uid}`).set(tenantUserData);
      console.log(`✅ Created tenant user document: tenants/${invitationData.tenantId}/users/${userData.uid}`);

      // Update subaccount allowed users lists
      for (const subAccountId of invitationData.subAccounts) {
        await db.doc(`tenants/${invitationData.tenantId}/subaccounts/${subAccountId}`).update({
          allowedUsers: admin.firestore.FieldValue.arrayUnion(userData.uid)
        });
      }

      // Mark invitation as accepted
      await db.doc(`invitations/${invitationId}`).update({
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        acceptedBy: userData.uid
      });

      // Log the acceptance
      await db.collection('auditLogs').add({
        tenantId: invitationData.tenantId,
        action: 'user_joined',
        performedBy: userData.uid,
        details: {
          invitationId,
          email: userData.email,
          name: userData.name,
          role: invitationData.role
        },
        timestamp: new Date().toISOString()
      });

      console.log(`✅ User successfully joined tenant: ${userData.uid}`);

      return newUser;

    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw new Error(`Failed to accept invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const createUserService = new CreateUserService();