import express from 'express';
import { emailAccountManager, EmailConfig } from '../../../emailAccounts/services/emailAccountManager';
import { db } from '../../../config/firestore';

const router = express.Router();

// ============================================================
// DEPRECATED ROUTES - Use /api/email-accounts instead
// ============================================================
// These routes duplicate functionality in emailAccountsRoutes.ts
// They are kept temporarily for backward compatibility but should
// NOT be used in new code. They will be removed in a future version.
//
// Migration guide:
// - GET    /api/oauth/accounts              → GET    /api/email-accounts
// - POST   /api/oauth/accounts/:id/sync     → POST   /api/email-accounts/:id/sync
// - DELETE /api/oauth/accounts/:id          → DELETE /api/email-accounts/:id
// - GET    /api/oauth/email-config          → GET    /api/email-accounts/config
// - PUT    /api/oauth/email-config          → PUT    /api/email-accounts/config
// - POST   /api/oauth/email-config/default  → POST   /api/email-accounts/config/default
// ============================================================

// DEPRECATED: Get all email accounts for a tenant
router.get('/accounts', async (req, res): Promise<void> => {
  try {
    const { tenantId } = req.query;
    
    if (!tenantId || typeof tenantId !== 'string') {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const accounts = await emailAccountManager.getAccounts(tenantId);
    
    // Transform accounts to match frontend interface
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
    console.error('Error fetching email accounts:', error);
    res.status(500).json({ error: 'Failed to fetch email accounts' });
  }
});

// DEPRECATED: Toggle sync for an account
router.post('/accounts/:accountId/sync', async (req, res): Promise<void> => {
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
});

// DEPRECATED: Remove an account
router.delete('/accounts/:accountId', async (req, res): Promise<void> => {
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
    console.error('Error removing account:', error);
    res.status(500).json({ error: 'Failed to remove account' });
  }
});

// ============================================================
// DEPRECATED EMAIL CONFIG ENDPOINTS (for /main document)
// Use /api/email-accounts/config endpoints instead
// ============================================================

// DEPRECATED: Get email configuration
router.get('/email-config', async (req, res): Promise<void> => {
  try {
    const { tenantId } = req.query;

    if (!tenantId || typeof tenantId !== 'string') {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const config = await emailAccountManager.getConfig(tenantId);

    // Return empty config if none exists
    res.json(config || {});
  } catch (error) {
    console.error('Error fetching email config:', error);
    res.status(500).json({ error: 'Failed to fetch email config' });
  }
});

// DEPRECATED: Update email configuration
router.put('/email-config', async (req, res): Promise<void> => {
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
});

// DEPRECATED: Set default email account
router.post('/email-config/default', async (req, res): Promise<void> => {
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
});

// ============================================================
// DEPRECATED: Mailgun account creation moved to /api/email-accounts
// This endpoint is kept for backward compatibility but should not be used
// ============================================================

export default router;