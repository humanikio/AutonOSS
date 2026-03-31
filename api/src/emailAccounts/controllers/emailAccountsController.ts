import { Request, Response } from 'express';
import { emailAccountManager, CreateAccountData } from '../services/emailAccountManager';
import { db } from '../../config/firestore';
import { domainManager } from '../../domains/services/domainManager';
import { mailgunDomainManager } from '../../mailgun/services/mailgunDomainManager';

/**
 * Extract root domain from any subdomain
 *
 * Examples:
 * - www.example.com -> example.com
 * - app.example.com -> example.com
 * - mail.example.co.uk -> example.co.uk
 * - example.com -> example.com
 *
 * This ensures emails use the root domain only
 *
 * @param domain - Full domain or subdomain
 * @returns Root domain
 */
function extractRootDomain(domain: string): string {
  const parts = domain.split('.');

  // If already a root domain (2 parts), return as-is
  if (parts.length <= 2) {
    return domain;
  }

  // List of known second-level domains (SLDs) for multi-part TLDs
  // e.g., .co.uk, .com.au, .gov.uk, etc.
  const knownSLDs = ['co', 'com', 'org', 'gov', 'edu', 'net', 'ac', 'mil'];

  const lastPart = parts[parts.length - 1];
  const secondLastPart = parts[parts.length - 2];

  // Check if this is a multi-part TLD (e.g., .co.uk)
  // If last part is 2-3 chars AND second-to-last is a known SLD, keep last 3 parts
  if (lastPart.length <= 3 && knownSLDs.includes(secondLastPart)) {
    // Multi-part TLD detected (e.g., mail.example.co.uk -> example.co.uk)
    return parts.slice(-3).join('.');
  }

  // Standard TLD - keep last 2 parts (e.g., www.example.com -> example.com)
  return parts.slice(-2).join('.');
}

class EmailAccountsController {
  /**
   * GET /api/email-accounts
   * List all email accounts for a tenant
   */
  async listAccounts(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const accounts = await emailAccountManager.getAccounts(tenantId);

      // Transform for frontend
      const formattedAccounts = accounts.map(account => ({
        id: account.id,
        email: account.email,
        friendlyName: account.name,
        provider: account.provider,
        status: account.status,
        connectedAt: account.connectedAt.toISOString(),
        lastSync: account.lastSync?.toISOString(),
        syncEnabled: account.syncEnabled,
        foldersSynced: account.foldersSynced,
        messagesCount: account.messagesCount
      }));

      res.json(formattedAccounts);
    } catch (error) {
      console.error('Error listing email accounts:', error);
      res.status(500).json({ error: 'Failed to list email accounts' });
    }
  }

  /**
   * GET /api/email-accounts/:accountId
   * Get a specific email account
   */
  async getAccount(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const account = await emailAccountManager.getAccount(tenantId, accountId);

      if (!account) {
        res.status(404).json({ error: 'Email account not found' });
        return;
      }

      res.json(account);
    } catch (error) {
      console.error('Error getting email account:', error);
      res.status(500).json({ error: 'Failed to get email account' });
    }
  }

  /**
   * POST /api/email-accounts
   * Create an email account (Mailgun or Custom Mailgun)
   */
  async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, provider, name, domainId, emailLocalPart } = req.body;

      if (!tenantId || !provider) {
        res.status(400).json({ error: 'tenantId and provider are required' });
        return;
      }

      if (provider !== 'mailgun' && provider !== 'customMailgun') {
        res.status(400).json({
          error: 'Only mailgun/customMailgun providers are supported for manual account creation. Use OAuth flow for Gmail/Outlook.'
        });
        return;
      }

      const existingAccounts = await emailAccountManager.getAccounts(tenantId);
      let email: string;
      let accountId: string;
      let displayName: string;

      if (provider === 'mailgun') {
        // DEFAULT AUTON EMAIL - Only 1 allowed
        const defaultExists = existingAccounts.some(acc => acc.provider === 'mailgun');

        if (defaultExists) {
          res.status(400).json({
            error: 'Default Auton Email already exists. Use custom domains for additional emails.'
          });
          return;
        }

        // Use default domain
        const domain = process.env.MAILGUN_DEFAULT_DOMAIN || 'mail.example.com';
        let localPart = 'noreply';

        // Fetch tenant name from Firestore to use for defaults
        displayName = 'Auton Email'; // Fallback

        try {
          const tenantDoc = await db.collection('tenants').doc(tenantId).get();
          if (tenantDoc.exists) {
            const tenantData = tenantDoc.data();
            const tenantName = tenantData?.name;
            if (tenantName) {
              displayName = `${tenantName}'s Auton Email`;

              // Sanitize tenant name for email (lowercase, alphanumeric + hyphens only)
              localPart = tenantName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') || 'noreply';

              console.log(`Using tenant name for Mailgun account: ${displayName}, email: ${localPart}@${domain}`);
            }
          }
        } catch (error) {
          console.error('Error fetching tenant name for account creation:', error);
        }

        // Allow override via name parameter
        if (name) {
          displayName = name;
        }

        email = `${localPart}@${domain}`;
        accountId = `mailgun-${tenantId}`;

      } else if (provider === 'customMailgun') {
        // CUSTOM DOMAIN EMAIL - UNLIMITED per domain

        if (!domainId || !emailLocalPart) {
          res.status(400).json({
            error: 'domainId and emailLocalPart are required for custom domain emails'
          });
          return;
        }

        // Extract root domain (strip www and subdomains)
        const rootDomain = extractRootDomain(domainId);
        if (rootDomain !== domainId) {
          console.log(`[EMAIL ACCOUNT] Extracted root domain: ${domainId} -> ${rootDomain}`);
        }

        // Validate domain exists, is verified, and connected to Mailgun
        const domain = await domainManager.getDomain(tenantId, rootDomain);

        if (!domain) {
          res.status(404).json({
            error: `Domain ${rootDomain} not found. Please add it at /settings/domains first.`
          });
          return;
        }

        if (domain.verification.status !== 'verified') {
          res.status(400).json({
            error: `Domain ${rootDomain} is not verified. Please verify it first.`
          });
          return;
        }

        if (!domain.connections.mailgun) {
          res.status(400).json({
            error: `Domain ${rootDomain} is not connected to Auton Mail. Please connect it first at /settings/domains.`
          });
          return;
        }

        // Validate Mailgun domain configuration exists
        const mailgunDomain = await mailgunDomainManager.getDomain(tenantId, rootDomain);
        if (!mailgunDomain) {
          res.status(400).json({
            error: `Mailgun configuration not found for ${rootDomain}. Please reconnect the domain.`
          });
          return;
        }

        // Validate email local part format
        if (!/^[a-z0-9._-]+$/.test(emailLocalPart)) {
          res.status(400).json({
            error: 'Email local part can only contain lowercase letters, numbers, dots, hyphens, and underscores'
          });
          return;
        }

        // Use root domain for email address
        email = `${emailLocalPart}@${rootDomain}`;

        // Check if email already exists
        const emailExists = existingAccounts.some(acc => acc.email.toLowerCase() === email.toLowerCase());
        if (emailExists) {
          res.status(400).json({
            error: `Email ${email} already exists`
          });
          return;
        }

        accountId = `custom-${tenantId}-${rootDomain}-${emailLocalPart}`;
        displayName = name || `${emailLocalPart}@${rootDomain}`;

        console.log(`Creating custom email: ${email} for tenant ${tenantId}`);
      } else {
        // This should never happen due to validation above, but TypeScript needs it
        res.status(400).json({
          error: 'Invalid provider type'
        });
        return;
      }

      const accountData: CreateAccountData = {
        id: accountId,
        email,
        name: displayName,
        provider,
        tenantId,
        ...(provider === 'customMailgun' && { domainId: extractRootDomain(domainId!) }), // Add root domainId for custom emails
        status: 'active',
        connectedAt: new Date(),
        syncEnabled: true,
        foldersSynced: 0,
        messagesCount: 0
      };

      await emailAccountManager.createAccount(accountData);

      // Initialize email config if it doesn't exist
      await emailAccountManager.initializeConfig(tenantId);

      res.json({ success: true, accountId, email });
    } catch (error) {
      console.error('Error creating email account:', error);
      res.status(500).json({
        error: 'Failed to create email account',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/email-accounts/:accountId
   * Remove an email account
   */
  async removeAccount(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const { tenantId } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      await emailAccountManager.removeAccount(tenantId, accountId);

      res.json({ success: true });
    } catch (error) {
      console.error('Error removing email account:', error);
      res.status(500).json({ error: 'Failed to remove email account' });
    }
  }

  /**
   * POST /api/email-accounts/:accountId/sync
   * Toggle sync status for an account
   */
  async toggleSync(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const { tenantId, syncEnabled } = req.body;

      if (!tenantId || typeof syncEnabled !== 'boolean') {
        res.status(400).json({ error: 'tenantId and syncEnabled are required' });
        return;
      }

      await emailAccountManager.updateAccount(tenantId, accountId, { syncEnabled });

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating sync status:', error);
      res.status(500).json({ error: 'Failed to update sync status' });
    }
  }

  /**
   * PATCH /api/email-accounts/:accountId
   * Update an email account (e.g., change display name or email address)
   */
  async updateAccount(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const { tenantId, name, email } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      // Get the account to check provider
      const account = await emailAccountManager.getAccount(tenantId, accountId);
      if (!account) {
        res.status(404).json({ error: 'Email account not found' });
        return;
      }

      // Build update data
      const updateData: Partial<{ name: string; email: string }> = {};

      if (name !== undefined) {
        updateData.name = name;
      }

      // Only allow email updates for Mailgun accounts
      if (email !== undefined) {
        if (account.provider !== 'mailgun') {
          res.status(400).json({ error: 'Email address can only be changed for Mailgun accounts' });
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          res.status(400).json({ error: 'Invalid email format' });
          return;
        }

        // Validate domain matches Mailgun domain
        const domain = process.env.MAILGUN_DEFAULT_DOMAIN || 'mail.example.com';
        if (!email.endsWith(`@${domain}`)) {
          res.status(400).json({
            error: `Email must end with @${domain}`
          });
          return;
        }

        updateData.email = email;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      await emailAccountManager.updateAccount(tenantId, accountId, updateData);

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating email account:', error);
      res.status(500).json({ error: 'Failed to update email account' });
    }
  }

  /**
   * GET /api/email-accounts/config
   * Get email configuration
   */
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const config = await emailAccountManager.getConfig(tenantId);

      res.json(config || {});
    } catch (error) {
      console.error('Error fetching email config:', error);
      res.status(500).json({ error: 'Failed to fetch email config' });
    }
  }

  /**
   * PUT /api/email-accounts/config
   * Update email configuration
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, ...configData } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      await emailAccountManager.updateConfig(tenantId, configData);

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating email config:', error);
      res.status(500).json({ error: 'Failed to update email config' });
    }
  }

  /**
   * POST /api/email-accounts/config/default
   * Set default email account
   */
  async setDefaultAccount(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, accountId } = req.body;

      if (!tenantId || !accountId) {
        res.status(400).json({ error: 'tenantId and accountId are required' });
        return;
      }

      await emailAccountManager.setDefaultAccount(tenantId, accountId);

      res.json({ success: true, defaultAccountId: accountId });
    } catch (error) {
      console.error('Error setting default email account:', error);
      res.status(500).json({
        error: 'Failed to set default email account',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const emailAccountsController = new EmailAccountsController();
