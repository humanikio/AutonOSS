import express from 'express';
import { authenticateEither } from '../../../middleware/authenticateEither';
import { contentStudioController } from '../controllers/contentStudioController';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateEither);

/**
 * GET /api/content-sessions
 * List all content sessions for a tenant
 *
 * Query:
 * - tenantId: string (required)
 */
router.get('/', contentStudioController.listSessions.bind(contentStudioController));

/**
 * GET /api/content-sessions/:sessionId
 * Get a specific content session
 *
 * Params:
 * - sessionId: string
 * Query:
 * - tenantId: string (required)
 */
router.get('/:sessionId', contentStudioController.getSession.bind(contentStudioController));

/**
 * POST /api/content-sessions
 * Create a new content session
 *
 * Body:
 * - tenantId: string (required)
 * - name: string (optional - defaults to "Untitled Session")
 * - prompt: string (optional)
 */
router.post('/', contentStudioController.createSession.bind(contentStudioController));

/**
 * PATCH /api/content-sessions/:sessionId
 * Update a content session
 *
 * Params:
 * - sessionId: string
 * Body:
 * - tenantId: string (required)
 * - name: string (optional)
 * - prompt: string (optional)
 * - imageCount: number (optional)
 * - status: 'draft' | 'completed' (optional)
 */
router.patch('/:sessionId', contentStudioController.updateSession.bind(contentStudioController));

/**
 * DELETE /api/content-sessions/:sessionId
 * Delete a content session
 *
 * Params:
 * - sessionId: string
 * Body:
 * - tenantId: string (required)
 */
router.delete('/:sessionId', contentStudioController.deleteSession.bind(contentStudioController));

/**
 * GET /api/content-sessions/:sessionId/assets
 * Get all generated assets for a session
 *
 * Params:
 * - sessionId: string
 * Query:
 * - tenantId: string (required)
 */
router.get('/:sessionId/assets', contentStudioController.getAssets.bind(contentStudioController));

/**
 * POST /api/content-sessions/:sessionId/generate
 * Generate an image for a session
 *
 * Params:
 * - sessionId: string
 * Body:
 * - tenantId: string (required)
 * - prompt: string (required - prompt for image generation)
 * - aspectRatio: string (optional - e.g., '1:1', '16:9')
 * - style: string (optional - e.g., 'photorealistic', 'artistic')
 * - quality: 'standard' | 'high' (optional - defaults to 'high')
 */
router.post('/:sessionId/generate', contentStudioController.generateImage.bind(contentStudioController));

/**
 * POST /api/content-sessions/:sessionId/assets/:assetId/save-to-library
 * Save a generated image to the central image library
 *
 * Params:
 * - sessionId: string
 * - assetId: string
 * Body:
 * - tenantId: string (required)
 * - tags: string[] (optional - additional tags for the image)
 * - purpose: string (optional - e.g., 'header', 'background')
 */
router.post('/:sessionId/assets/:assetId/save-to-library', contentStudioController.saveToLibrary.bind(contentStudioController));

export default router;
