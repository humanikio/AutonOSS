// Import all helper functions
import { createAccount } from './emailAccountManager/createAccount';
import { getAccount } from './emailAccountManager/getAccount';
import { getAccounts } from './emailAccountManager/getAccounts';
import { updateAccount } from './emailAccountManager/updateAccount';
import { removeAccount } from './emailAccountManager/removeAccount';
import { getConfig } from './emailAccountManager/getConfig';
import { updateConfig } from './emailAccountManager/updateConfig';
import { setDefaultAccount } from './emailAccountManager/setDefaultAccount';
import { initializeConfig } from './emailAccountManager/initializeConfig';

/**
 * Email Account Manager
 *
 * Provider-agnostic service for managing email accounts and configuration.
 * All Firestore operations for email accounts go through this service.
 */
export const emailAccountManager = {
  // ============================================================
  // ACCOUNT OPERATIONS
  // ============================================================

  /**
   * Create or update an email account
   */
  createAccount,

  /**
   * Get a specific email account
   */
  getAccount,

  /**
   * Get all email accounts for a tenant (optionally filtered)
   */
  getAccounts,

  /**
   * Get active accounts only
   */
  getActiveAccounts: (tenantId: string) =>
    getAccounts(tenantId, { status: 'active', syncEnabled: true }),

  /**
   * Update an email account
   */
  updateAccount,

  /**
   * Remove an email account
   */
  removeAccount,

  // ============================================================
  // CONFIG OPERATIONS (/main document)
  // ============================================================

  /**
   * Get email configuration for a tenant
   */
  getConfig,

  /**
   * Update email configuration
   */
  updateConfig,

  /**
   * Set default email account
   */
  setDefaultAccount,

  /**
   * Get the default account ID for a tenant
   */
  getDefaultAccountId: async (tenantId: string): Promise<string | null> => {
    const config = await getConfig(tenantId);
    return config?.defaultAccountId || null;
  },

  /**
   * Initialize email config if it doesn't exist
   */
  initializeConfig
};

// Export types
export * from './emailAccountManager/types';
