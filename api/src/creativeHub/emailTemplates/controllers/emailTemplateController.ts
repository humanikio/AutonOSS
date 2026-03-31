import { Request, Response } from 'express';
import {
  createEmailTemplate,
  getEmailTemplates,
  readEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  CreateEmailTemplateData,
  UpdateEmailTemplateData
} from '../services/emailTemplateManager';

class EmailTemplateController {
  /**
   * GET /api/email-templates
   * List all email templates for a tenant
   */
  async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, status } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const templates = await getEmailTemplates(tenantId);

      // Filter by status if provided
      let filteredTemplates = templates;
      if (status && typeof status === 'string') {
        filteredTemplates = templates.filter(t => t.status === status);
      }

      // Transform for frontend
      const formattedTemplates = filteredTemplates.map(template => ({
        id: template.id,
        name: template.name,
        htmlContent: template.htmlContent,
        aiPrompt: template.aiPrompt,
        status: template.status,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
        createdBy: template.createdBy
      }));

      res.json(formattedTemplates);
    } catch (error) {
      console.error('Error listing email templates:', error);
      res.status(500).json({ error: 'Failed to list email templates' });
    }
  }

  /**
   * GET /api/email-templates/:templateId
   * Get a specific email template
   */
  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { tenantId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const template = await readEmailTemplate(tenantId, templateId);

      if (!template) {
        res.status(404).json({ error: 'Email template not found' });
        return;
      }

      // Transform for frontend
      const formattedTemplate = {
        id: template.id,
        name: template.name,
        htmlContent: template.htmlContent,
        aiPrompt: template.aiPrompt,
        status: template.status,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
        createdBy: template.createdBy
      };

      res.json(formattedTemplate);
    } catch (error) {
      console.error('Error getting email template:', error);
      res.status(500).json({ error: 'Failed to get email template' });
    }
  }

  /**
   * POST /api/email-templates
   * Create a new email template
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, name, htmlContent, aiPrompt } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      // Get userId from authenticated request (if available)
      const userId = (req as any).user?.uid;

      const templateData: CreateEmailTemplateData = {
        name: name || 'Untitled Template',
        htmlContent: htmlContent || '',
        aiPrompt: aiPrompt || ''
      };

      const template = await createEmailTemplate(tenantId, templateData, userId);

      // Transform for frontend
      const formattedTemplate = {
        id: template.id,
        name: template.name,
        htmlContent: template.htmlContent,
        aiPrompt: template.aiPrompt,
        status: template.status,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
        createdBy: template.createdBy
      };

      res.status(201).json({
        success: true,
        template: formattedTemplate
      });
    } catch (error) {
      console.error('Error creating email template:', error);
      res.status(500).json({ error: 'Failed to create email template' });
    }
  }

  /**
   * PATCH /api/email-templates/:templateId
   * Update an email template
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { tenantId, name, htmlContent, aiPrompt, status } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      const updateData: UpdateEmailTemplateData = {};
      if (name !== undefined) updateData.name = name;
      if (htmlContent !== undefined) updateData.htmlContent = htmlContent;
      if (aiPrompt !== undefined) updateData.aiPrompt = aiPrompt;
      if (status !== undefined) updateData.status = status;

      const template = await updateEmailTemplate(tenantId, templateId, updateData);

      // Transform for frontend
      const formattedTemplate = {
        id: template.id,
        name: template.name,
        htmlContent: template.htmlContent,
        aiPrompt: template.aiPrompt,
        status: template.status,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
        createdBy: template.createdBy
      };

      res.json({
        success: true,
        template: formattedTemplate
      });
    } catch (error) {
      console.error('Error updating email template:', error);
      if (error instanceof Error && error.message === 'Email template not found') {
        res.status(404).json({ error: 'Email template not found' });
      } else {
        res.status(500).json({ error: 'Failed to update email template' });
      }
    }
  }

  /**
   * DELETE /api/email-templates/:templateId
   * Delete an email template
   */
  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { tenantId } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      await deleteEmailTemplate(tenantId, templateId);

      res.json({
        success: true,
        message: 'Email template deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting email template:', error);
      if (error instanceof Error && error.message === 'Email template not found') {
        res.status(404).json({ error: 'Email template not found' });
      } else {
        res.status(500).json({ error: 'Failed to delete email template' });
      }
    }
  }
}

export const emailTemplateController = new EmailTemplateController();
