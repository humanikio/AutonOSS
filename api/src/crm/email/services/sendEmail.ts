import { findEmailAccount } from './sendEmail/findEmailAccount';
import { sendGmailMessage } from './sendEmail/providers/sendGmailMessage';
import { sendMailgunMessage } from './sendEmail/providers/sendMailgunMessage';
import { saveEmailToFirestoreConvo } from './sendEmail/saveToFirestoreConvo';
import { conversationManager } from '../../../agentCommunication/sms/services/conversationManager';
import { emailAccountManager } from '../../../emailAccounts/services/emailAccountManager';
import { db } from '../../../config/firestore';
import { prepareEmailContent } from './sendEmail/prepareEmailContent';
import { readEmailTemplate } from '../../../creativeHub/emailTemplates/services/emailTemplateManager';
import { ensureContactAddress } from '../../../contacts/utilities/ensureContactAddress';

export interface SendEmailRequest {
  tenantId: string;
  contactId: string;
  conversationId?: string; // Optional - will be created if not provided
  emailAccountId?: string; // Optional - will use default if not provided
  subject: string;
  message?: string; // Plain text message (optional if htmlContent or templateId provided)
  htmlContent?: string; // HTML content (optional if message or templateId provided)
  templateId?: string; // Optional - template ID to fetch content from
  to: string; // Recipient email address
}

export interface SendEmailResponse {
  messageId: string;
  status: string;
  threadId?: string;
  conversationId: string; // Return conversationId so frontend knows which conversation was created/used
}

class SendEmailService {
  // Helper method to convert plain text to basic HTML
  private textToHtml(text: string): string {
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  // Helper method to strip HTML tags for plain text fallback
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  async sendMessage(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      console.log(`Starting email send flow for tenant ${request.tenantId}`);

      // Step -1: Resolve template if templateId is provided
      if (request.templateId && !request.htmlContent) {
        console.log(`📧 Resolving template: ${request.templateId}`);
        try {
          const template = await readEmailTemplate(request.tenantId, request.templateId);
          if (template) {
            request.htmlContent = template.htmlContent;
            console.log(`✅ Resolved template "${template.name}" - injected htmlContent`);
          } else {
            console.warn(`⚠️  Template not found: ${request.templateId}`);
            throw new Error(`Email template not found: ${request.templateId}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching template:`, error);
          throw new Error(`Failed to fetch email template: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Validate email address format
      if (!this.isValidEmail(request.to)) {
        throw new Error(`Invalid recipient email address: ${request.to}`);
      }

      // Validate that at least one content type is provided
      if (!request.message && !request.htmlContent) {
        throw new Error('Either message, htmlContent, or templateId must be provided');
      }

      // Step 0: Ensure conversation exists (create if missing)
      let conversationId: string = request.conversationId || '';
      if (!conversationId) {
        console.log(`Step 0: No conversation ID provided, creating EMAIL conversation for contact ${request.contactId}`);
        conversationId = await conversationManager.findOrCreateConversation(request.tenantId, request.contactId);
        console.log(`Step 0: Using conversation ID: ${conversationId}`);
      } else {
        console.log(`Step 0: Using provided conversation ID: ${conversationId}`);
      }

      // Step 0.1: Ensure contact has email address record (required for frontend display)
      await ensureContactAddress(request.tenantId, request.contactId, 'EMAIL', request.to);

      // Step 0.5: Prepare email content with variable injection
      console.log(`Step 0.5: Preparing email content with variable substitution`);

      // Determine which content to process
      const hasHtml = !!request.htmlContent;
      const contentToProcess = hasHtml ? request.htmlContent! : request.message!;

      // Prepare content with variable substitution
      const preparedContent = await prepareEmailContent.prepare({
        tenantId: request.tenantId,
        contactId: request.contactId,
        content: contentToProcess,
        isHtml: hasHtml
      });

      // Set final content based on what was prepared
      let finalTextContent: string;
      let finalHtmlContent: string;

      if (hasHtml) {
        // HTML was provided and prepared
        finalHtmlContent = preparedContent.preparedContent;
        // If no plain text provided, generate from HTML
        finalTextContent = request.message || this.stripHtmlTags(finalHtmlContent);
      } else {
        // Plain text was provided and prepared
        finalTextContent = preparedContent.preparedContent;
        // Auto-generate HTML from prepared text
        finalHtmlContent = this.textToHtml(finalTextContent);
      }

      console.log(`Step 0.5: Content preparation complete (${preparedContent.variablesFound.length} variables processed)`);

      // Step 1: Resolve email account ID (use default if not specified)
      let emailAccountId = request.emailAccountId;

      if (!emailAccountId) {
        console.log(`Step 1: No emailAccountId provided, fetching default account`);
        emailAccountId = await emailAccountManager.getDefaultAccountId(request.tenantId) ?? undefined;

        if (!emailAccountId) {
          throw new Error('No email account specified and no default account configured. Please connect an email account or specify an emailAccountId.');
        }

        console.log(`Step 1: Using default email account: ${emailAccountId}`);
      } else {
        console.log(`Step 1: Using specified email account: ${emailAccountId}`);
      }

      // Step 2: Get the email account to determine provider
      console.log(`Step 2: Finding email account details`);
      const emailAccount = await emailAccountManager.getAccount(
        request.tenantId,
        emailAccountId
      );

      if (!emailAccount) {
        throw new Error(`Email account ${emailAccountId} not found for tenant ${request.tenantId}`);
      }

      if (emailAccount.status !== 'active') {
        throw new Error(`Email account ${emailAccountId} is not active. Status: ${emailAccount.status}`);
      }

      let emailResponse: { messageId: string; status: string; threadId?: string };
      let fromEmail: string;

      // Step 3: Route to the appropriate provider
      if (emailAccount.provider === 'gmail') {
        console.log(`Step 3: Sending email via Gmail API from ${emailAccount.email}`);

        // Get OAuth tokens for Gmail
        const tokens = await findEmailAccount.getEmailAccountTokens(
          request.tenantId,
          emailAccountId
        );

        emailResponse = await sendGmailMessage.sendEmail({
          accessToken: tokens.accessToken,
          from: tokens.email,
          to: request.to,
          subject: request.subject,
          body: finalTextContent,
          htmlBody: finalHtmlContent,
          tenantId: request.tenantId
        });

        fromEmail = tokens.email;

      } else if (emailAccount.provider === 'mailgun' || emailAccount.provider === 'customMailgun') {
        console.log(`Step 3: Sending email via Mailgun API (${emailAccount.provider})`);

        // Use the account's display name (editable by user)
        const displayName = emailAccount.name;
        console.log(`Using account display name: ${displayName}`);

        // Extract domain from email address
        const domain = emailAccount.email.split('@')[1];
        console.log(`Using domain: ${domain}`);

        emailResponse = await sendMailgunMessage.sendEmail({
          tenantId: request.tenantId,
          contactId: request.contactId,
          conversationId: conversationId,
          fromName: displayName,
          fromEmail: emailAccount.email, // Use custom email address
          to: request.to,
          subject: request.subject,
          body: finalTextContent,
          htmlBody: finalHtmlContent,
          domain: domain // Pass domain for custom domain support
        });

        fromEmail = emailAccount.email;

      } else {
        throw new Error(`Unsupported email provider: ${emailAccount.provider}`);
      }

      console.log(`Email response: Message ID ${emailResponse.messageId}, Status: ${emailResponse.status}`);

      // Step 4: Save the outbound message to Firestore conversation
      console.log(`Step 4: Saving outbound email to Firestore`);
      await saveEmailToFirestoreConvo.saveOutboundMessage({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: conversationId,
        messageId: emailResponse.messageId,
        fromEmail: fromEmail,
        toEmail: request.to,
        subject: request.subject,
        messageBody: finalTextContent,
        htmlContent: finalHtmlContent,
        direction: 'outbound',
        threadId: emailResponse.threadId
      });

      console.log(`Successfully completed email send flow. Message ID: ${emailResponse.messageId}`);

      return {
        messageId: emailResponse.messageId,
        status: emailResponse.status,
        threadId: emailResponse.threadId,
        conversationId: conversationId // Return the conversation ID that was created or used
      };

    } catch (error) {
      console.error('Error in email send flow:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateMessageStatus(
    tenantId: string,
    contactId: string,
    conversationId: string,
    messageId: string,
    status: string
  ): Promise<void> {
    try {
      await saveEmailToFirestoreConvo.updateMessageStatus(
        tenantId,
        contactId,
        conversationId,
        messageId,
        status
      );
    } catch (error) {
      console.error('Error updating email message status:', error);
      throw error;
    }
  }

  // Helper method to validate email format
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Helper method to get available email accounts for a tenant
  async getAvailableEmailAccounts(tenantId: string): Promise<Array<{id: string, email: string, name: string, provider: string}>> {
    try {
      const accounts = await emailAccountManager.getActiveAccounts(tenantId);

      return accounts.map(account => ({
        id: account.id,
        email: account.email,
        name: account.name,
        provider: account.provider
      }));
    } catch (error) {
      console.error('Error getting available email accounts:', error);
      return [];
    }
  }
}

export const sendEmailService = new SendEmailService();