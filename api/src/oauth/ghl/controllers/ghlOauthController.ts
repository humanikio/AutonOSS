import { Request, Response } from 'express';
import { ghlOauthService } from '../services/ghlOauthService';
import { ghlAccountService } from '../services/ghlAccountService';

export const ghlOauthController = {
  async initiateOAuth(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const authUrl = await ghlOauthService.generateAuthUrl(tenantId);

      res.json({ authUrl });
    } catch (error) {
      console.error('Error initiating GHL OAuth:', error);
      res.status(500).json({ error: 'Failed to initiate OAuth' });
    }
  },

  async reconnectOAuth(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, locationId } = req.body;

      if (!tenantId || !locationId) {
        res.status(400).json({ error: 'tenantId and locationId are required' });
        return;
      }

      const authUrl = await ghlOauthService.generateReconnectUrl(tenantId, locationId);

      res.json({ authUrl });
    } catch (error) {
      console.error('Error reconnecting GHL OAuth:', error);
      res.status(500).json({ error: 'Failed to initiate reconnect' });
    }
  },

  async handleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        res.status(400).json({ error: 'Missing code or state parameter' });
        return;
      }

      const result = await ghlOauthService.handleCallback(
        code as string,
        state as string
      );

      // Redirect to frontend success page
      res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?success=true&provider=ghl`);
    } catch (error) {
      console.error('Error handling GHL OAuth callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=oauth_failed`);
    }
  },

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, locationId } = req.body;

      if (!tenantId || !locationId) {
        res.status(400).json({ error: 'tenantId and locationId are required' });
        return;
      }

      const newTokens = await ghlOauthService.refreshToken(tenantId, locationId);

      res.json({ success: true, tokens: newTokens });
    } catch (error) {
      console.error('Error refreshing GHL token:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  },

  async revokeAccess(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, locationId } = req.body;

      if (!tenantId || !locationId) {
        res.status(400).json({ error: 'tenantId and locationId are required' });
        return;
      }

      await ghlOauthService.revokeAccess(tenantId, locationId);

      res.json({ success: true });
    } catch (error) {
      console.error('Error revoking GHL access:', error);
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

      const accounts = await ghlAccountService.getAccountsByTenant(tenantId);

      res.json({ accounts });
    } catch (error) {
      console.error('Error getting GHL OAuth status:', error);
      res.status(500).json({ error: 'Failed to get OAuth status' });
    }
  }
};
