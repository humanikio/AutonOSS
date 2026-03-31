import { Request, Response } from 'express';
import { handleGlobalEmailInbound, MailgunInboundPayload } from '../services/handleGlobalEmailInbound';
import { EmailAttachment } from '../services/emailAttachmentService';

/**
 * Controller for handling Mailgun inbound email webhooks
 * Pattern matches SMS inbound controller (inboundSmsController.ts)
 */
export class MailgunInboundController {
  /**
   * Handle incoming email webhook from Mailgun
   *
   * Mailgun posts inbound emails to this endpoint when a route matches
   * The payload contains email metadata, body, headers, and authentication data
   * Attachments come as multipart file uploads in req.files
   */
  async handleIncomingEmail(req: Request, res: Response): Promise<void> {
    try {
      console.log('[CONTROLLER] Incoming email webhook received from Mailgun');

      // Extract webhook payload from request body
      const payload: MailgunInboundPayload = req.body;

      // Extract attachments from req.files (populated by multer middleware)
      const attachments: EmailAttachment[] = [];

      if (req.files) {
        // When using upload.any(), req.files is an array, not an object
        const files = req.files as Express.Multer.File[];
        console.log(`[CONTROLLER] Processing ${files.length} file(s)`);

        // Iterate directly over the files array
        for (const file of files) {
          // Extract Content-ID from headers if present (for inline images)
          const contentId = this.extractContentId(file);

          attachments.push({
            filename: file.originalname || file.fieldname,
            contentType: file.mimetype,
            contentId,
            buffer: file.buffer
          });

          console.log(`[CONTROLLER] Attachment: ${file.originalname} (${file.mimetype}), CID: ${contentId || 'none'}`);
        }
      }

      // Add attachments to payload
      payload.attachments = attachments;

      // Log basic info for debugging
      console.log('[CONTROLLER] Email received:', {
        recipient: payload.recipient,
        sender: payload.sender,
        subject: payload.subject,
        hasAuth: !!(payload.timestamp && payload.token && payload.signature),
        attachmentCount: attachments.length
      });

      // Process the complete email inbound flow
      await handleGlobalEmailInbound(payload);

      console.log('[CONTROLLER] Email processing completed successfully');

      // Return 200 success response
      // Always return 200 to prevent Mailgun from retrying
      res.status(200).json({
        success: true,
        message: 'Email received and processed'
      });

    } catch (error) {
      console.error('[CONTROLLER] Error processing incoming email:', error);

      // Even on error, return 200 to prevent Mailgun retries
      // Log the error for monitoring
      res.status(200).json({
        success: false,
        message: 'Email received but processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Extract Content-ID from multer file
   * Mailgun may include this in headers or metadata for inline images
   */
  private extractContentId(file: Express.Multer.File): string | undefined {
    // Check if Content-ID is in the file object
    // Mailgun might include it in various places depending on configuration
    const fileWithHeaders = file as any;

    // Try common locations for Content-ID
    if (fileWithHeaders.headers && fileWithHeaders.headers['content-id']) {
      return fileWithHeaders.headers['content-id'].replace(/^<|>$/g, '');
    }

    if (fileWithHeaders['content-id']) {
      return fileWithHeaders['content-id'].replace(/^<|>$/g, '');
    }

    // Content-ID might also be in fieldname for inline attachments
    // Mailgun might send it as: inline-{cid}
    if (file.fieldname && file.fieldname.startsWith('inline-')) {
      return file.fieldname.replace('inline-', '');
    }

    return undefined;
  }
}

export const mailgunInboundController = new MailgunInboundController();
