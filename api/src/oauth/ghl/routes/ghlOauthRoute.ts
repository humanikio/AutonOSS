import express from 'express';
import { ghlOauthController } from '../controllers/ghlOauthController';
import { ghlAccountService } from '../services/ghlAccountService';
import { authenticateToken } from '../../../middleware/auth';

const router = express.Router();

// OAuth Flow Endpoints
router.post('/initiate', authenticateToken, ghlOauthController.initiateOAuth);
router.post('/reconnect', authenticateToken, ghlOauthController.reconnectOAuth);
router.get('/callback', ghlOauthController.handleCallback);
router.post('/refresh', authenticateToken, ghlOauthController.refreshToken);
router.post('/revoke', authenticateToken, ghlOauthController.revokeAccess);
router.get('/status/:tenantId', authenticateToken, ghlOauthController.getOAuthStatus);

// Account Management Endpoints
router.get('/accounts', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { tenantId } = req.query;

    if (!tenantId || typeof tenantId !== 'string') {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const accounts = await ghlAccountService.getAccountsByTenant(tenantId);

    const formattedAccounts = accounts.map(account => ({
      id: account.id,
      locationId: account.locationId,
      locationName: account.locationName,
      companyId: account.companyId,
      status: account.status,
      connectedAt: account.connectedAt.toISOString(),
      lastSync: account.lastSync?.toISOString(),
      syncEnabled: account.syncEnabled,
      scopes: account.scopes,
      userType: account.userType
    }));

    res.json(formattedAccounts);
  } catch (error) {
    console.error('Error fetching GHL accounts:', error);
    res.status(500).json({ error: 'Failed to fetch GHL accounts' });
  }
});

router.get('/accounts/:locationId', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { locationId } = req.params;
    const { tenantId } = req.query;

    if (!tenantId || typeof tenantId !== 'string') {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const account = await ghlAccountService.getAccount(tenantId, locationId);

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const formattedAccount = {
      id: account.id,
      locationId: account.locationId,
      locationName: account.locationName,
      companyId: account.companyId,
      status: account.status,
      connectedAt: account.connectedAt.toISOString(),
      lastSync: account.lastSync?.toISOString(),
      syncEnabled: account.syncEnabled,
      scopes: account.scopes,
      userType: account.userType,
      tokenExpiresAt: account.tokenExpiresAt?.toISOString()
    };

    res.json(formattedAccount);
  } catch (error) {
    console.error('Error fetching account details:', error);
    res.status(500).json({ error: 'Failed to fetch account details' });
  }
});

router.post('/accounts/:locationId/sync', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { locationId } = req.params;
    const { tenantId, syncEnabled } = req.body;

    if (!tenantId || typeof syncEnabled !== 'boolean') {
      res.status(400).json({ error: 'tenantId and syncEnabled are required' });
      return;
    }

    await ghlAccountService.updateSyncStatus(tenantId, locationId, syncEnabled);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating sync status:', error);
    res.status(500).json({ error: 'Failed to update sync status' });
  }
});

router.delete('/accounts/:locationId', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { locationId } = req.params;
    const { tenantId } = req.body;

    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    await ghlAccountService.removeAccount(tenantId, locationId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing account:', error);
    res.status(500).json({ error: 'Failed to remove account' });
  }
});

export default router;
