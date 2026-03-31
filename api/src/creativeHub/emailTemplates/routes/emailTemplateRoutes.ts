import express from 'express';
import { authenticateEither } from '../../../middleware/authenticateEither';
import { emailTemplateController } from '../controllers/emailTemplateController';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateEither);

/**
 * GET /api/email-templates
 * List all email templates for a tenant
 *
 * Query:
 * - tenantId: string (required)
 */
router.get('/', emailTemplateController.listTemplates.bind(emailTemplateController));

/**
 * GET /api/email-templates/:templateId
 * Get a specific email template
 *
 * Params:
 * - templateId: string
 * Query:
 * - tenantId: string (required)
 */
router.get('/:templateId', emailTemplateController.getTemplate.bind(emailTemplateController));

/**
 * POST /api/email-templates
 * Create a new email template
 *
 * Body:
 * - tenantId: string (required)
 * - name: string (optional - defaults to "Untitled Template")
 * - htmlContent: string (optional)
 * - aiPrompt: string (optional)
 */
router.post('/', emailTemplateController.createTemplate.bind(emailTemplateController));

/**
 * PATCH /api/email-templates/:templateId
 * Update an email template
 *
 * Params:
 * - templateId: string
 * Body:
 * - tenantId: string (required)
 * - name: string (optional)
 * - htmlContent: string (optional)
 * - aiPrompt: string (optional)
 * - status: 'draft' | 'published' (optional)
 */
router.patch('/:templateId', emailTemplateController.updateTemplate.bind(emailTemplateController));

/**
 * DELETE /api/email-templates/:templateId
 * Delete an email template
 *
 * Params:
 * - templateId: string
 * Body:
 * - tenantId: string (required)
 */
router.delete('/:templateId', emailTemplateController.deleteTemplate.bind(emailTemplateController));

export default router;
