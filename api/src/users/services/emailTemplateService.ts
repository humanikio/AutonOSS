import { emailService, EmailOptions } from '../../nodeMailer/emailService';

export interface InvitationEmailData {
  inviteeName: string;
  inviteeEmail: string;
  inviterName: string;
  inviterEmail: string;
  companyName: string;
  role: 'admin' | 'user';
  inviteUrl: string;
  expiresAt: string;
  subAccountCount?: number;
}

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  companyName: string;
  role: string;
  dashboardUrl: string;
}

class EmailTemplateService {

  /**
   * Generate invitation email HTML content
   */
  generateInvitationEmailHTML(data: InvitationEmailData): string {
    const {
      inviteeName,
      inviterName,
      companyName,
      role,
      inviteUrl,
      expiresAt,
      subAccountCount = 0
    } = data;

    const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const roleDisplay = role === 'admin' ? 'Administrator' : 'Team Member';
    const roleIcon = role === 'admin' ? '🛡️' : '👤';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're Invited to Join ${companyName}</title>
        <style>
          /* Reset and base styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #111827;
            background-color: #f9fafb;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
          }
          
          .header {
            background: white;
            color: #111827;
            padding: 40px 30px;
            text-align: center;
            border-bottom: 3px solid #0794e0;
          }
          
          .logo {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            background: #f8fafc;
            border: 2px solid #0794e0;
            border-radius: 12px;
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #111827;
          }
          
          .header p {
            font-size: 16px;
            color: #6b7280;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .invitation-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin: 25px 0;
            border: 2px solid #e5e7eb;
            border-left: 4px solid #0794e0;
          }
          
          .role-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #eff6ff;
            color: #0794e0;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 20px;
            border: 1px solid #bfdbfe;
          }
          
          .company-name {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 15px;
          }
          
          .details {
            color: #6b7280;
            font-size: 15px;
            line-height: 1.6;
          }
          
          .details strong {
            color: #374151;
          }
          
          .cta-container {
            text-align: center;
            margin: 35px 0;
          }
          
          .cta-button {
            display: inline-block;
            background: #0794e0;
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.2s ease;
            border: 2px solid #0794e0;
          }
          
          .cta-button:hover {
            background: #0369a1;
            border-color: #0369a1;
            transform: translateY(-1px);
            box-shadow: 0 8px 25px rgba(7, 148, 224, 0.3);
          }
          
          .secondary-info {
            background: #fef3c7;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            border-left: 4px solid #f59e0b;
            border: 1px solid #fde68a;
          }
          
          .secondary-info h3 {
            color: #92400e;
            font-size: 16px;
            margin-bottom: 8px;
          }
          
          .secondary-info p {
            color: #b45309;
            font-size: 14px;
          }
          
          .features-list {
            margin: 25px 0;
          }
          
          .features-list h3 {
            color: #111827;
            font-size: 18px;
            margin-bottom: 15px;
          }
          
          .features-list ul {
            list-style: none;
            padding-left: 0;
          }
          
          .features-list li {
            padding: 8px 0;
            color: #6b7280;
            position: relative;
            padding-left: 25px;
          }
          
          .features-list li::before {
            content: "✓";
            color: #0794e0;
            font-weight: bold;
            position: absolute;
            left: 0;
          }
          
          .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          
          .footer p {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 10px;
          }
          
          .footer a {
            color: #0794e0;
            text-decoration: none;
          }
          
          .footer a:hover {
            text-decoration: underline;
          }
          
          .backup-link {
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            font-size: 12px;
            color: #6b7280;
            word-break: break-all;
          }
          
          /* Mobile responsiveness */
          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 8px;
            }
            
            .header, .content {
              padding: 25px 20px;
            }
            
            .invitation-card {
              padding: 20px;
            }
            
            .header h1 {
              font-size: 24px;
            }
            
            .company-name {
              font-size: 20px;
            }
            
            .cta-button {
              padding: 14px 28px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="logo">
              <!-- TODO: Replace with your logo URL -->
              <img src="" alt="Logo" />
            </div>
            <h1>🎉 You're Invited!</h1>
            <p>Join ${companyName} on Auton</p>
          </div>
          
          <!-- Content -->
          <div class="content">
            <p>Hi <strong>${inviteeName}</strong>,</p>
            
            <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on Auton as a team member.</p>
            
            <!-- Invitation Details Card -->
            <div class="invitation-card">
              <div class="role-badge">
                <span>${roleIcon}</span>
                <span>${roleDisplay}</span>
              </div>
              
              <div class="company-name">${companyName}</div>
              
              <div class="details">
                <p><strong>Invited by:</strong> ${inviterName}</p>
                <p><strong>Your role:</strong> ${roleDisplay}</p>
                ${subAccountCount > 0 ? `<p><strong>Subaccount access:</strong> ${subAccountCount} subaccount${subAccountCount !== 1 ? 's' : ''}</p>` : ''}
                <p><strong>Expires:</strong> ${expirationDate}</p>
              </div>
            </div>
            
            <!-- Call to Action -->
            <div class="cta-container">
              <a href="${inviteUrl}" class="cta-button">
                Accept Invitation & Join Team
              </a>
            </div>
            
            <!-- What you'll get -->
            <div class="features-list">
              <h3>What you'll get access to:</h3>
              <ul>
                <li>AI-powered automation and workflows</li>
                <li>Shared contacts and conversation history</li>
                <li>Real-time messaging and notifications</li>
                ${role === 'admin' ? '<li>Administrative controls and user management</li>' : ''}
                ${subAccountCount > 0 ? `<li>Access to ${subAccountCount} specialized subaccount${subAccountCount !== 1 ? 's' : ''}</li>` : ''}
                <li>24/7 customer support</li>
              </ul>
            </div>
            
            <!-- Expiration Warning -->
            <div class="secondary-info">
              <h3>⏰ Time Sensitive</h3>
              <p>This invitation expires on ${expirationDate}. Make sure to accept it before then!</p>
            </div>
            
            <!-- Backup Link -->
            <div class="backup-link">
              <strong>Having trouble with the button?</strong><br>
              Copy and paste this link into your browser:<br>
              ${inviteUrl}
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p>This invitation was sent by ${inviterName} from ${companyName}</p>
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
            <p>
              <a href="mailto:support@auton.ai">Contact Support</a> | 
              <a href="https://auton.ai/privacy">Privacy Policy</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate invitation email plain text content (fallback)
   */
  generateInvitationEmailText(data: InvitationEmailData): string {
    const {
      inviteeName,
      inviterName,
      companyName,
      role,
      inviteUrl,
      expiresAt,
      subAccountCount = 0
    } = data;

    const expirationDate = new Date(expiresAt).toLocaleDateString();
    const roleDisplay = role === 'admin' ? 'Administrator' : 'Team Member';

    return `
You're Invited to Join ${companyName}!

Hi ${inviteeName},

${inviterName} has invited you to join ${companyName} on Auton as a ${roleDisplay}.

Invitation Details:
- Company: ${companyName}
- Your Role: ${roleDisplay}
- Invited by: ${inviterName}
${subAccountCount > 0 ? `- Subaccount Access: ${subAccountCount} subaccount${subAccountCount !== 1 ? 's' : ''}` : ''}
- Expires: ${expirationDate}

To accept this invitation, click here or copy the link into your browser:
${inviteUrl}

What you'll get access to:
- AI-powered automation and workflows
- Shared contacts and conversation history
- Real-time messaging and notifications
${role === 'admin' ? '- Administrative controls and user management' : ''}
${subAccountCount > 0 ? `- Access to ${subAccountCount} specialized subaccount${subAccountCount !== 1 ? 's' : ''}` : ''}
- 24/7 customer support

This invitation expires on ${expirationDate}, so make sure to accept it before then!

If you weren't expecting this invitation, you can safely ignore this email.

---
This invitation was sent by ${inviterName} from ${companyName}
Contact Support: support@auton.ai
Privacy Policy: https://auton.ai/privacy
    `.trim();
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const emailOptions: EmailOptions = {
        to: data.inviteeEmail,
        subject: `You're invited to join ${data.companyName} on Auton`,
        htmlContent: this.generateInvitationEmailHTML(data),
        textContent: this.generateInvitationEmailText(data)
      };

      const result = await emailService.sendEmail(emailOptions);
      
      if (result.success) {
        console.log(`✅ Invitation email sent to ${data.inviteeEmail}`);
        return { success: true };
      } else {
        console.error(`❌ Failed to send invitation email to ${data.inviteeEmail}:`, result.error);
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('Error sending invitation email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }

  /**
   * Generate welcome email HTML content (for after user accepts invitation)
   */
  generateWelcomeEmailHTML(data: WelcomeEmailData): string {
    const { userName, companyName, role, dashboardUrl } = data;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${companyName}!</title>
        <style>
          /* Similar styles as invitation email but with welcome theme */
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          }
          
          .header {
            background: white;
            color: #111827;
            padding: 40px 30px;
            text-align: center;
            border-bottom: 3px solid #10b981;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .cta-button {
            display: inline-block;
            background: #10b981;
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            border: 2px solid #10b981;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ${companyName}!</h1>
            <p>You're now part of the team on Auton</p>
          </div>
          
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            
            <p>Welcome to <strong>${companyName}</strong>! Your invitation has been accepted and your account is now active on Auton.</p>
            
            <p>Your role: <strong>${role}</strong></p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${dashboardUrl}" class="cta-button">
                Go to Dashboard
              </a>
            </div>
            
            <p>If you have any questions, don't hesitate to reach out to your team or our support at support@auton.ai.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send welcome email (after invitation acceptance)
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const emailOptions: EmailOptions = {
        to: data.userEmail,
        subject: `Welcome to ${data.companyName}!`,
        htmlContent: this.generateWelcomeEmailHTML(data)
      };

      const result = await emailService.sendEmail(emailOptions);
      
      if (result.success) {
        console.log(`✅ Welcome email sent to ${data.userEmail}`);
        return { success: true };
      } else {
        console.error(`❌ Failed to send welcome email to ${data.userEmail}:`, result.error);
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }
}

// Create singleton instance
export const emailTemplateService = new EmailTemplateService();

// Export class and instance
export { EmailTemplateService };
export default emailTemplateService;