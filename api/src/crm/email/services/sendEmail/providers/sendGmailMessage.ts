import { google } from 'googleapis';

export interface GmailSendRequest {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  body: string; // Plain text body
  htmlBody?: string; // HTML body (optional)
  tenantId: string; // For logging purposes
}

export interface GmailSendResponse {
  messageId: string;
  status: string;
  threadId?: string;
}

class SendGmailMessage {
  private createEmailMessage(from: string, to: string, subject: string, body: string, htmlBody?: string): string {
    // Create RFC 2822 formatted email with multipart support
    if (htmlBody) {
      // Create multipart email with both plain text and HTML
      const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const messageParts = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        body,
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        htmlBody,
        ``,
        `--${boundary}--`
      ];

      const message = messageParts.join('\r\n');

      // Encode the message in base64url format
      return Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } else {
      // Create simple plain text email
      const messageParts = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        body
      ];

      const message = messageParts.join('\n');
      
      // Encode the message in base64url format
      return Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }
  }

  async sendEmail(request: GmailSendRequest): Promise<GmailSendResponse> {
    try {
      console.log(`Sending Gmail message from ${request.from} to ${request.to} for tenant ${request.tenantId}`);

      // Create OAuth2 client with access token
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: request.accessToken
      });

      // Create Gmail API client
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Create the email message
      const encodedMessage = this.createEmailMessage(
        request.from,
        request.to,
        request.subject,
        request.body,
        request.htmlBody
      );

      // Send the email
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      if (!response.data.id) {
        throw new Error('Gmail API did not return a message ID');
      }

      console.log(`Successfully sent Gmail message. Message ID: ${response.data.id}`);

      return {
        messageId: response.data.id,
        status: 'sent',
        threadId: response.data.threadId || undefined
      };

    } catch (error) {
      console.error('Error sending Gmail message:', error);
      
      // Handle specific Gmail API errors
      if (error && typeof error === 'object' && 'code' in error) {
        const gmailError = error as any;
        if (gmailError.code === 401) {
          throw new Error('Gmail authentication failed. Please reconnect your email account.');
        } else if (gmailError.code === 403) {
          throw new Error('Gmail API access denied. Check your email account permissions.');
        } else if (gmailError.code === 429) {
          throw new Error('Gmail API rate limit exceeded. Please try again later.');
        }
      }

      throw new Error(`Failed to send Gmail message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMessageStatus(accessToken: string, messageId: string): Promise<string> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId
      });

      // Gmail doesn't have delivery status like SMS, but we can check if message exists
      return response.data ? 'delivered' : 'unknown';

    } catch (error) {
      console.error('Error checking Gmail message status:', error);
      return 'unknown';
    }
  }
}

export const sendGmailMessage = new SendGmailMessage();