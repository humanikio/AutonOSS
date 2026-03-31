/**
 * API Keys Routes
 * Defines routes for API key management
 *
 * Note: These routes require Firebase JWT authentication only.
 * API keys cannot be used to manage API keys (security best practice).
 */

import express from 'express';
import { apiKeysController } from '../controllers/apiKeysController';
import { requireFirebaseAuth } from '../../middleware/requireFirebaseAuth';

const router = express.Router();

// All routes require Firebase JWT authentication (not API keys)
router.use(requireFirebaseAuth);

/**
 * POST /api/api-keys
 * Create a new API key
 */
router.post('/', apiKeysController.createApiKey);

/**
 * GET /api/api-keys
 * List all API keys for the authenticated tenant
 */
router.get('/', apiKeysController.listApiKeys);

/**
 * GET /api/api-keys/:apiKeyId
 * Get a specific API key
 */
router.get('/:apiKeyId', apiKeysController.getApiKey);

/**
 * PUT /api/api-keys/:apiKeyId
 * Update an API key (name, active status, scopes)
 */
router.put('/:apiKeyId', apiKeysController.updateApiKey);

/**
 * DELETE /api/api-keys/:apiKeyId
 * Delete an API key
 */
router.delete('/:apiKeyId', apiKeysController.deleteApiKey);

export default router;
