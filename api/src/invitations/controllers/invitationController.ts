import { Request, Response } from 'express';
import { createUserService } from '../../users/services/manageUsers';
import { db } from '../../config/firestore';
import { adminAuth } from '../../config/firebase';
import { APIResponse } from '../../types';

export interface GetInvitationResponse {
  invitation: {
    id: string;
    tenantId: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    subAccounts: string[];
    status: 'pending' | 'accepted' | 'expired';
    invitedBy: string;
    invitedAt: string;
    expiresAt: string;
    inviteUrl: string;
  };
  tenant: {
    name: string;
    settings?: {
      branding?: {
        companyName?: string;
      }
    }
  };
  invitedByUser: {
    name: string;
    email: string;
  };
}

export interface AcceptInvitationRequest {
  uid: string;
  email: string;
  name: string;
}

export class InvitationController {

  /**
   * Get invitation details by invitation ID
   */
  async getInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { invitationId } = req.params;

      console.log(`📧 Getting invitation details: ${invitationId}`);

      if (!invitationId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: invitationId',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get invitation document
      const invitationDoc = await db.doc(`invitations/${invitationId}`).get();
      
      if (!invitationDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'Invitation not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const invitationData = invitationDoc.data();
      if (!invitationData) {
        res.status(404).json({
          success: false,
          error: 'Invitation data not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if invitation has expired
      if (new Date(invitationData.expiresAt) < new Date()) {
        // Update status to expired
        await db.doc(`invitations/${invitationId}`).update({
          status: 'expired',
          updatedAt: new Date().toISOString()
        });
        invitationData.status = 'expired';
      }

      // Get tenant information
      const tenantDoc = await db.doc(`tenants/${invitationData.tenantId}`).get();
      const tenantData = tenantDoc.exists ? tenantDoc.data() : null;

      // Get invited by user information
      const invitedByUserDoc = await db.doc(`users/${invitationData.invitedBy}`).get();
      const invitedByUserData = invitedByUserDoc.exists ? invitedByUserDoc.data() : null;

      const response: GetInvitationResponse = {
        invitation: {
          id: invitationData.id,
          tenantId: invitationData.tenantId,
          email: invitationData.email,
          name: invitationData.name,
          role: invitationData.role,
          subAccounts: invitationData.subAccounts || [],
          status: invitationData.status,
          invitedBy: invitationData.invitedBy,
          invitedAt: invitationData.invitedAt,
          expiresAt: invitationData.expiresAt,
          inviteUrl: invitationData.inviteUrl
        },
        tenant: {
          name: tenantData?.name || 'Company',
          settings: tenantData?.settings
        },
        invitedByUser: {
          name: invitedByUserData?.name || 'Admin',
          email: invitedByUserData?.email || 'admin@company.com'
        }
      };

      res.status(200).json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error getting invitation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get invitation details',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Accept invitation and create user account
   */
  async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { invitationId } = req.params;
      const { uid, email, name } = req.body as AcceptInvitationRequest;
      
      console.log(`✅ Accepting invitation: ${invitationId} for user: ${email}`);
      console.log(`📋 Request body:`, { uid, email, name });

      // Validation
      if (!invitationId || !uid || !email || !name) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'invitationId, uid, email, and name are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify Firebase token to ensure the UID is legitimate
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
      console.log(`🔑 Auth header:`, { authHeader: !!authHeader, token: token ? `${token.substring(0, 20)}...` : 'null' });

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Firebase token required',
          message: 'Authorization header with Bearer token is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        
        // Verify the UID matches the token
        if (decodedToken.uid !== uid) {
          res.status(401).json({
            success: false,
            error: 'Token UID mismatch',
            message: 'The provided UID does not match the Firebase token',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Verify email matches if present in token
        if (decodedToken.email && decodedToken.email !== email) {
          console.warn(`Email mismatch: token=${decodedToken.email}, body=${email}`);
        }
      } catch (tokenError: any) {
        console.error('Firebase token verification failed:', tokenError);
        res.status(401).json({
          success: false,
          error: 'Invalid Firebase token',
          message: 'Firebase token verification failed',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Use the existing acceptInvitation method from createUserService
      const user = await createUserService.acceptInvitation(invitationId, {
        uid,
        email,
        name
      });

      res.status(200).json({
        success: true,
        data: {
          success: true,
          user
        },
        message: 'Invitation accepted successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to accept invitation',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default InvitationController;