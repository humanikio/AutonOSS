import { Request, Response } from 'express';
import { mailgunAliasManager } from '../services/mailgunAliasManager/mailgunAliasManager';

export interface GenerateAliasRequest {
  tenantId: string;
  contactId: string;
  conversationId?: string;
}

export interface ResolveAliasRequest {
  alias: string;
}

class MailgunController {
  /**
   * Generates a Mailgun alias for tracking
   * POST /api/mailgun/alias/generate
   */
  async generateAlias(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, contactId, conversationId }: GenerateAliasRequest = req.body;

      // Validate required fields
      if (!tenantId) {
        res.status(400).json({
          error: 'tenantId is required'
        });
        return;
      }

      if (!contactId) {
        res.status(400).json({
          error: 'contactId is required'
        });
        return;
      }

      // Generate the alias
      const alias = mailgunAliasManager.generateAlias({
        tenantId,
        contactId,
        conversationId
      });

      res.status(200).json({
        success: true,
        alias
      });

    } catch (error) {
      console.error('Error generating Mailgun alias:', error);
      res.status(500).json({
        error: 'Failed to generate alias',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Resolves a Mailgun alias back to its components
   * POST /api/mailgun/alias/resolve
   */
  async resolveAlias(req: Request, res: Response): Promise<void> {
    try {
      const { alias }: ResolveAliasRequest = req.body;

      // Validate required field
      if (!alias) {
        res.status(400).json({
          error: 'alias is required'
        });
        return;
      }

      // Resolve the alias
      const resolution = mailgunAliasManager.resolveAlias(alias);

      if (!resolution.valid) {
        res.status(400).json({
          error: 'Invalid or malformed alias'
        });
        return;
      }

      res.status(200).json({
        success: true,
        tenantId: resolution.tenantId,
        contactId: resolution.contactId,
        conversationId: resolution.conversationId
      });

    } catch (error) {
      console.error('Error resolving Mailgun alias:', error);
      res.status(500).json({
        error: 'Failed to resolve alias',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const mailgunController = new MailgunController();
