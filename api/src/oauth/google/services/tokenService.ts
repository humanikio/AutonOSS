import { google } from 'googleapis';
import { emailAccountManager } from '../../../emailAccounts/services/emailAccountManager';

const OAuth2 = google.auth.OAuth2;

export const tokenService = {
  async refreshToken(tenantId: string, accountId: string) {
    const account = await emailAccountManager.getAccount(tenantId, accountId);
    
    if (!account || !account.refreshToken) {
      throw new Error('Account not found or no refresh token available');
    }

    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL}/api/oauth/google/callback`
    );

    oauth2Client.setCredentials({
      refresh_token: account.refreshToken
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update account with new tokens
      const updatedAccount = {
        ...account,
        accessToken: credentials.access_token!,
        tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        // Update refresh token if a new one was provided
        refreshToken: credentials.refresh_token || account.refreshToken,
        updatedAt: new Date()
      };

      await emailAccountManager.updateAccount(tenantId, accountId, updatedAccount);
      
      return {
        accessToken: credentials.access_token,
        expiresAt: credentials.expiry_date
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Mark account as having token issues
      await emailAccountManager.updateAccount(tenantId, accountId, {
        status: 'error'
      });
      throw new Error('Failed to refresh token');
    }
  },

  async isTokenExpired(tenantId: string, accountId: string): Promise<boolean> {
    const account = await emailAccountManager.getAccount(tenantId, accountId);
    
    if (!account || !account.tokenExpiresAt) {
      return true;
    }

    // Add 5 minute buffer before actual expiration
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const expirationWithBuffer = new Date(account.tokenExpiresAt.getTime() - bufferTime);
    
    return new Date() > expirationWithBuffer;
  },

  async getValidAccessToken(tenantId: string, accountId: string): Promise<string> {
    const isExpired = await this.isTokenExpired(tenantId, accountId);
    
    if (isExpired) {
      const tokens = await this.refreshToken(tenantId, accountId);
      return tokens.accessToken!;
    }

    const account = await emailAccountManager.getAccount(tenantId, accountId);
    if (!account || !account.accessToken) {
      throw new Error('No valid access token available');
    }

    return account.accessToken;
  },

  async revokeToken(tenantId: string, accountId: string) {
    const account = await emailAccountManager.getAccount(tenantId, accountId);
    
    if (!account || !account.accessToken) {
      return; // Already revoked or doesn't exist
    }

    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL}/api/oauth/google/callback`
    );

    oauth2Client.setCredentials({ access_token: account.accessToken });

    try {
      await oauth2Client.revokeCredentials();
    } catch (error) {
      console.error('Error revoking token (may already be revoked):', error);
    }
  }
};