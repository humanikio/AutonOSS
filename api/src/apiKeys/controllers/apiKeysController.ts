/**
 * API Keys Controller
 * Handles HTTP requests for API key management
 */

import { Request, Response } from 'express';
import * as apiKeysCrud from '../services/apiKeysCrudManager';

export const apiKeysController = {
  /**
   * Create a new API key
   * POST /api-keys
   */
  async createApiKey(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!; // From auth middleware
      const userId = req.user!.uid;
      const { name, environment, scopes, expiresAt, isAccountKey } = req.body;

      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      const { apiKey, accessKeyId, apiSecret, fullKey } = await apiKeysCrud.createApiKey(
        tenantId,
        userId,
        { name, environment, scopes, expiresAt, isAccountKey }
      );

      res.status(201).json({
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          secretLastFour: apiKey.secretLastFour,
          environment: apiKey.environment,
          active: apiKey.active,
          isAccountKey: apiKey.isAccountKey,
          createdAt: apiKey.createdAt
        },
        accessKeyId, // Access Key ID (plkey_xxx)
        apiSecret,   // API Secret (plsec_yyy) - ONLY TIME shown!
        fullKey,     // Combined format (accessKeyId.apiSecret)
        warning: 'Store this key securely. It will not be shown again.'
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({ error: 'Failed to create API key' });
    }
  },

  /**
   * List all API keys for the authenticated tenant
   * GET /api-keys
   */
  async listApiKeys(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const apiKeys = await apiKeysCrud.listApiKeys(tenantId);

      res.status(200).json({ apiKeys });
    } catch (error) {
      console.error('Error listing API keys:', error);
      res.status(500).json({ error: 'Failed to list API keys' });
    }
  },

  /**
   * Get a specific API key
   * GET /api-keys/:apiKeyId
   */
  async getApiKey(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { apiKeyId } = req.params;

      const apiKey = await apiKeysCrud.getApiKey(tenantId, apiKeyId);

      if (!apiKey) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      // Don't return encrypted secret
      const { encryptedSecret, ...safeData } = apiKey;

      res.status(200).json({ apiKey: safeData });
    } catch (error) {
      console.error('Error getting API key:', error);
      res.status(500).json({ error: 'Failed to get API key' });
    }
  },

  /**
   * Update an API key
   * PUT /api-keys/:apiKeyId
   */
  async updateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { apiKeyId } = req.params;
      const { name, active, scopes } = req.body;

      const apiKey = await apiKeysCrud.updateApiKey(tenantId, apiKeyId, {
        name,
        active,
        scopes
      });

      // Don't return encrypted secret
      const { encryptedSecret, ...safeData } = apiKey;

      res.status(200).json({ apiKey: safeData });
    } catch (error) {
      console.error('Error updating API key:', error);
      res.status(500).json({ error: 'Failed to update API key' });
    }
  },

  /**
   * Delete an API key
   * DELETE /api-keys/:apiKeyId
   */
  async deleteApiKey(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { apiKeyId } = req.params;

      await apiKeysCrud.deleteApiKey(tenantId, apiKeyId);

      res.status(200).json({ message: 'API key deleted successfully' });
    } catch (error) {
      console.error('Error deleting API key:', error);
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  }
};
