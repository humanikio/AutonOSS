import { google } from 'googleapis';
import { tokenService } from './tokenService';
import { emailAccountManager } from '../../../emailAccounts/services/emailAccountManager';

const OAuth2 = google.auth.OAuth2;

export const googleOauthService = {
  getOAuthClient() {
    return new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL}/api/oauth/google/callback`
    );
  },

  async generateAuthUrl(tenantId: string): Promise<string> {
    const oauth2Client = this.getOAuthClient();
    
    const scopes = [
      'https://www.googleapis.com/auth/gmail.modify',      // Read, compose, send, and permanently delete emails
      'https://www.googleapis.com/auth/gmail.send',        // Send emails on behalf of the user
      'https://www.googleapis.com/auth/gmail.labels',      // Manage labels and filters
      'https://www.googleapis.com/auth/userinfo.email',    // Access user's email address
      'https://www.googleapis.com/auth/userinfo.profile'   // Access basic profile info
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: tenantId, // Pass tenantId as state parameter
      prompt: 'consent' // Force consent screen to get refresh token
    });

    return authUrl;
  },

  async handleCallback(code: string, state: string) {
    const oauth2Client = this.getOAuthClient();
    const tenantId = state; // tenantId passed as state
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Delegate account creation to emailAccountManager
    await emailAccountManager.createAccount({
      id: userInfo.id!,
      email: userInfo.email!,
      name: userInfo.name || userInfo.email!,
      provider: 'gmail',
      tenantId,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      status: 'active',
      connectedAt: new Date()
    });

    return { success: true, accountId: userInfo.id };
  },

  async revokeAccess(tenantId: string, accountId: string) {
    const account = await emailAccountManager.getAccount(tenantId, accountId);

    if (!account || !account.accessToken) {
      throw new Error('Account not found or no access token');
    }

    const oauth2Client = this.getOAuthClient();
    oauth2Client.setCredentials({ access_token: account.accessToken });

    // Revoke the token
    await oauth2Client.revokeCredentials();

    // Remove account from database
    await emailAccountManager.removeAccount(tenantId, accountId);
  },

  async validateToken(tenantId: string, accountId: string): Promise<boolean> {
    try {
      const account = await emailAccountManager.getAccount(tenantId, accountId);

      if (!account || !account.accessToken) {
        return false;
      }

      // Check if token is expired and refresh if needed
      if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
        if (account.refreshToken) {
          await tokenService.refreshToken(tenantId, accountId);
          return true;
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }
};