import { Request, Response } from 'express';
import { sendEmailService } from '../services/sendEmail';
import { findOrCreateConversation } from '../../../contacts/utilities/conversationUtil';

export interface SendEmailRequest {
  tenantId: string;
  contactId: string;
  conversationId?: string; // Optional - will be auto-resolved from contactId if not provided
  emailAccountId?: string; // Optional - will use default account if not provided
  subject: string;
  message?: string; // Plain text message (optional if htmlContent or templateId provided)
  htmlContent?: string; // HTML content (optional if message or templateId provided)
  templateId?: string; // Optional - template ID to fetch content from
  to: string; // Recipient email address
}

export interface GetEmailAccountsRequest {
  tenantId: string;
}

class EmailController {
  async sendEmail(req: Request, res: Response): Promise<void> {
    try {
      // Extract tenantId from middleware (API key) or body (JWT)
      const tenantId = req.tenantId || req.body.tenantId;

      const {
        contactId,
        conversationId,
        emailAccountId,
        subject,
        message,
        htmlContent,
        templateId,
        to
      } = req.body;

      // Validate required fields (conversationId and emailAccountId are optional)
      if (!tenantId || !contactId || !subject || !to) {
        res.status(400).json({
          error: 'Missing required fields',
          required: ['tenantId', 'contactId', 'subject', 'to']
        });
        return;
      }

      // At least one content type must be provided
      if (!message && !htmlContent && !templateId) {
        res.status(400).json({
          error: 'Either message, htmlContent, or templateId must be provided'
        });
        return;
      }

      // Additional validation
      if (subject.trim().length === 0) {
        res.status(400).json({
          error: 'Email subject cannot be empty'
        });
        return;
      }

      if (message && message.trim().length === 0) {
        res.status(400).json({
          error: 'Email message cannot be empty if provided'
        });
        return;
      }

      if (htmlContent && htmlContent.trim().length === 0) {
        res.status(400).json({
          error: 'HTML content cannot be empty if provided'
        });
        return;
      }

      // Auto-resolve conversationId from contactId if not provided
      let resolvedConversationId = conversationId;
      if (!resolvedConversationId) {
        console.log('📍 No conversationId provided, auto-resolving from contactId...');
        resolvedConversationId = await findOrCreateConversation(tenantId, contactId);
        console.log(`📍 Auto-resolved conversationId: ${resolvedConversationId}`);
      }

      // Send email via service
      const result = await sendEmailService.sendMessage({
        tenantId,
        contactId,
        conversationId: resolvedConversationId,
        emailAccountId,
        subject,
        message,
        htmlContent,
        templateId,
        to
      });

      res.status(200).json({
        success: true,
        messageId: result.messageId,
        threadId: result.threadId,
        conversationId: result.conversationId,
        message: 'Email sent successfully'
      });

    } catch (error) {
      console.error('Error sending email:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('authentication failed') || error.message.includes('reconnect')) {
          res.status(401).json({
            error: 'Email account authentication failed',
            details: error.message,
            action: 'Please reconnect your email account'
          });
          return;
        }
        
        if (error.message.includes('not found') || error.message.includes('not active')) {
          res.status(404).json({
            error: 'Email account not available',
            details: error.message
          });
          return;
        }

        if (error.message.includes('Invalid recipient email')) {
          res.status(400).json({
            error: 'Invalid recipient email address',
            details: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getEmailAccounts(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId }: GetEmailAccountsRequest = req.query as any;

      if (!tenantId) {
        res.status(400).json({
          error: 'tenantId is required as query parameter'
        });
        return;
      }

      // Get available email accounts for the tenant
      const emailAccounts = await sendEmailService.getAvailableEmailAccounts(tenantId);

      res.status(200).json({
        success: true,
        emailAccounts: emailAccounts
      });

    } catch (error) {
      console.error('Error getting email accounts:', error);
      res.status(500).json({
        error: 'Failed to get email accounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateMessageStatus(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, contactId, conversationId, messageId, status } = req.body;

      if (!tenantId || !contactId || !conversationId || !messageId || !status) {
        res.status(400).json({
          error: 'Missing required fields',
          required: ['tenantId', 'contactId', 'conversationId', 'messageId', 'status']
        });
        return;
      }

      await sendEmailService.updateMessageStatus(
        tenantId,
        contactId,
        conversationId,
        messageId,
        status
      );

      res.status(200).json({
        success: true,
        message: 'Message status updated successfully'
      });

    } catch (error) {
      console.error('Error updating message status:', error);
      res.status(500).json({
        error: 'Failed to update message status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const emailController = new EmailController();