import FormData from 'form-data';
import axios from 'axios';
import { mailgunAliasManager } from '../../../../../mailgun/services/mailgunAliasManager/mailgunAliasManager';

export interface MailgunSendRequest {
  tenantId: string;
  contactId: string;
  conversationId?: string;
  fromName: string; // Display name for sender (e.g., "Support Team")
  fromEmail?: string; // Custom email address (e.g., "synthcor@mail.example.com")
  to: string;
  subject: string;
  body: string; // Plain text body
  htmlBody?: string; // HTML body
  domain?: string; // Custom domain for sending (for customMailgun provider)
}

export interface MailgunSendResponse {
  messageId: string;
  status: string;
}

class SendMailgunMessage {
  /**
   * Sends an email via Mailgun API
   */
  async sendEmail(request: MailgunSendRequest): Promise<MailgunSendResponse> {
    try {
      console.log(`Sending Mailgun message to ${request.to} for tenant ${request.tenantId}`);

      // Get Mailgun configuration from environment
      // Use MAILGUN_API_KEY (Account API Key) first, fallback to MAILGUN_SENDING_KEY
      const apiKey = process.env.MAILGUN_API_KEY || process.env.MAILGUN_SENDING_KEY;

      // Use custom domain if provided, otherwise fall back to default domain
      const domain = request.domain || process.env.MAILGUN_DEFAULT_DOMAIN;

      if (!apiKey) {
        throw new Error('MAILGUN_API_KEY or MAILGUN_SENDING_KEY not configured');
      }
      if (!domain) {
        throw new Error('No domain specified and MAILGUN_DEFAULT_DOMAIN not configured');
      }

      console.log(`Using domain for sending: ${domain}`);

      // Generate reply-to alias for inbound tracking
      const replyToAlias = mailgunAliasManager.generateAlias({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId,
        domain: domain // Pass domain for custom domain aliases
      });

      console.log(`Generated reply-to alias: ${replyToAlias}`);

      // Construct sender email - use custom email if provided, otherwise default to noreply
      const fromEmail = request.fromEmail || `noreply@${domain}`;
      const fromField = request.fromName ? `${request.fromName} <${fromEmail}>` : fromEmail;

      console.log(`Sending from: ${fromField}`);

      // Prepare form data
      const formData = new FormData();
      formData.append('from', fromField);
      formData.append('to', request.to);
      formData.append('subject', request.subject);
      formData.append('text', request.body);

      if (request.htmlBody) {
        formData.append('html', request.htmlBody);
      }

      // Add reply-to header
      formData.append('h:Reply-To', replyToAlias);

      // Add custom variables for webhook tracking
      formData.append('v:tenant-id', request.tenantId);
      formData.append('v:contact-id', request.contactId);
      if (request.conversationId) {
        formData.append('v:conversation-id', request.conversationId);
      }

      // Make API request to Mailgun
      const url = `https://api.mailgun.net/v3/${domain}/messages`;
      const response = await axios.post(url, formData, {
        auth: {
          username: 'api',
          password: apiKey
        },
        headers: {
          ...formData.getHeaders()
        }
      });

      if (!response.data.id) {
        throw new Error('Mailgun API did not return a message ID');
      }

      console.log(`Successfully sent Mailgun message. Message ID: ${response.data.id}`);

      return {
        messageId: response.data.id,
        status: 'sent'
      };

    } catch (error) {
      console.error('Error sending Mailgun message:', error);

      // Handle specific Mailgun API errors
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || 'Unknown Mailgun error';

        if (status === 401) {
          throw new Error('Mailgun authentication failed. Check your API key.');
        } else if (status === 400) {
          throw new Error(`Mailgun request error: ${message}`);
        } else if (status === 429) {
          throw new Error('Mailgun rate limit exceeded. Please try again later.');
        }
      }

      throw new Error(`Failed to send Mailgun message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const sendMailgunMessage = new SendMailgunMessage();
