import { Request, Response } from 'express';
import { googleOauthService } from '../services/googleOauthService';
import { tokenService } from '../services/tokenService';
import { emailAccountManager } from '../../../emailAccounts/services/emailAccountManager';

export const googleOauthController = {
  async initiateOAuth(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.body;
      
      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const authUrl = await googleOauthService.generateAuthUrl(tenantId);
      
      res.json({ authUrl });
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      res.status(500).json({ error: 'Failed to initiate OAuth' });
    }
  },

  async handleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        res.status(400).json({ error: 'Missing code or state parameter' });
        return;
      }

      const result = await googleOauthService.handleCallback(
        code as string, 
        state as string
      );
      
      // Redirect to frontend success page
      res.redirect(`${process.env.FRONTEND_URL}/settings/emails?success=true`);
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/settings/emails?error=oauth_failed`);
    }
  },

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, accountId } = req.body;
      
      if (!tenantId || !accountId) {
        res.status(400).json({ error: 'tenantId and accountId are required' });
        return;
      }

      const newTokens = await tokenService.refreshToken(tenantId, accountId);
      
      res.json({ success: true, tokens: newTokens });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  },

  async revokeAccess(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, accountId } = req.body;
      
      if (!tenantId || !accountId) {
        res.status(400).json({ error: 'tenantId and accountId are required' });
        return;
      }

      await googleOauthService.revokeAccess(tenantId, accountId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error revoking access:', error);
      res.status(500).json({ error: 'Failed to revoke access' });
    }
  },

  async getOAuthStatus(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const accounts = await emailAccountManager.getAccounts(tenantId);

      res.json({ accounts });
    } catch (error) {
      console.error('Error getting OAuth status:', error);
      res.status(500).json({ error: 'Failed to get OAuth status' });
    }
  }
};