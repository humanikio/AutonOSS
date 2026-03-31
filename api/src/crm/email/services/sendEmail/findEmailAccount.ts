import { emailAccountManager } from '../../../../emailAccounts/services/emailAccountManager';
import { tokenService } from '../../../../oauth/google/services/tokenService';

export interface EmailAccountTokens {
  accountId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | null;
}

class FindEmailAccount {
  async getEmailAccountTokens(tenantId: string, emailAccountId: string): Promise<EmailAccountTokens> {
    try {
      console.log(`Finding email account tokens for tenant ${tenantId}, account ${emailAccountId}`);

      // Get the email account from Firestore
      const emailAccount = await emailAccountManager.getAccount(tenantId, emailAccountId);
      
      if (!emailAccount) {
        throw new Error(`Email account ${emailAccountId} not found for tenant ${tenantId}`);
      }

      if (emailAccount.status !== 'active') {
        throw new Error(`Email account ${emailAccountId} is not active. Status: ${emailAccount.status}`);
      }

      // Get a valid access token (handles refresh if needed)
      const validAccessToken = await tokenService.getValidAccessToken(tenantId, emailAccountId);

      console.log(`Successfully retrieved tokens for email account ${emailAccount.email}`);

      // Ensure refreshToken exists
      if (!emailAccount.refreshToken) {
        throw new Error(`Email account ${emailAccountId} has no refresh token`);
      }

      return {
        accountId: emailAccount.id,
        email: emailAccount.email,
        accessToken: validAccessToken,
        refreshToken: emailAccount.refreshToken,
        expiresAt: emailAccount.tokenExpiresAt ?? null
      };

    } catch (error) {
      console.error('Error retrieving email account tokens:', error);
      throw new Error(`Failed to retrieve email account tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateEmailAccount(tenantId: string, emailAccountId: string): Promise<boolean> {
    try {
      const emailAccount = await emailAccountManager.getAccount(tenantId, emailAccountId);
      return !!(emailAccount && emailAccount.status === 'active' && emailAccount.refreshToken);
    } catch (error) {
      console.error('Error validating email account:', error);
      return false;
    }
  }
}

export const findEmailAccount = new FindEmailAccount();