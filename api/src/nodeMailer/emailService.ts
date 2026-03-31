import nodemailer from 'nodemailer';
import { config } from 'dotenv';

// Load environment variables
config();

export interface EmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  
  constructor() {
    this.transporter = this.createTransporter();
  }

  private createTransporter(): nodemailer.Transporter {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
      console.warn('⚠️  Email credentials not found. Email sending will be disabled.');
      console.warn('   Please set EMAIL_USER and EMAIL_PASS environment variables.');
    }

    return nodemailer.createTransport({
      service: 'gmail', // Using Gmail SMTP
      auth: {
        user: emailUser,
        pass: emailPass // This should be an App Password for Gmail
      },
      secure: true, // Use TLS
      port: 465
    });
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResponse> {
    try {
      const { to, subject, htmlContent, textContent } = options;
      
      // Validate required fields
      if (!to || !subject || !htmlContent) {
        return {
          success: false,
          error: 'Missing required email fields (to, subject, htmlContent)'
        };
      }

      // Check if email service is configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn(`📧 Would send email to: ${to}`);
        console.warn(`   Subject: ${subject}`);
        console.warn('   Email service not configured - email not sent');
        
        return {
          success: false,
          error: 'Email service not configured'
        };
      }

      const mailOptions = {
        from: {
          name: 'Auton',
          address: process.env.EMAIL_USER!
        },
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent)
      };

      console.log(`📧 Sending email to: ${to}`);
      console.log(`   Subject: ${subject}`);
      
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully');
      console.log(`   Message ID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }

  /**
   * Send multiple emails (batch sending)
   */
  async sendBatchEmails(emails: EmailOptions[]): Promise<{
    successful: number;
    failed: number;
    results: EmailResponse[];
  }> {
    console.log(`📧 Sending batch of ${emails.length} emails`);
    
    const results: EmailResponse[] = [];
    let successful = 0;
    let failed = 0;

    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Add small delay between emails to avoid rate limiting
      if (emails.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Batch email complete: ${successful} successful, ${failed} failed`);
    
    return {
      successful,
      failed,
      results
    };
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Test email sending
   */
  async sendTestEmail(to: string): Promise<EmailResponse> {
    return this.sendEmail({
      to,
      subject: 'Auton Email Service Test',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0794e0;">Email Service Test</h2>
          <p>This is a test email from the Auton email service.</p>
          <p>If you received this email, the email configuration is working correctly.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from: ${process.env.EMAIL_USER}<br>
            Timestamp: ${new Date().toISOString()}
          </p>
        </div>
      `
    });
  }
}

// Create singleton instance
export const emailService = new EmailService();

// Export types and service
export { EmailService };
export default emailService;