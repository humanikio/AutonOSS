import { db } from '../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export interface CreateEmailTemplateData {
  name: string;
  htmlContent?: string;
  aiPrompt?: string;
}

export interface EmailTemplate {
  id: string;
  tenantId: string;
  name: string;
  htmlContent: string;
  aiPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  status: 'draft' | 'published';
}

/**
 * Create a new email template
 */
export async function createEmailTemplate(
  tenantId: string,
  data: CreateEmailTemplateData,
  userId?: string
): Promise<EmailTemplate> {
  try {
    const templateRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc();

    const now = FieldValue.serverTimestamp();

    const defaultHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to the Email Template Editor</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f7fa;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; max-width: 600px;">

          <!-- Header with Auton Logo -->
          <tr>
            <td align="center" style="padding: 40px 30px 30px 30px; background-color: #ffffff;">
              <!-- TODO: Replace with your logo URL -->
              <img src="" alt="Logo" width="80" height="80" style="display: block; max-width: 80px; height: auto; border: 0;">
            </td>
          </tr>

          <!-- Hero Headline Section -->
          <tr>
            <td style="padding: 30px 40px; background-color: #ffffff; text-align: center;">
              <h1 style="margin: 0 0 15px 0; font-family: Arial, Helvetica, sans-serif; font-size: 36px; font-weight: bold; color: #4A9EFF; line-height: 1.3;">Welcome to the Email Editor!</h1>
              <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; color: #333333; line-height: 1.6;">Create beautiful, professional email templates with AI assistance</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-top: 2px solid #4A9EFF;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Robot Image with Instructions -->
          <tr>
            <td style="padding: 40px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="35%" valign="top" style="padding-right: 20px;">
                    <!-- TODO: Replace with your assistant image URL -->
                    <img src="" alt="Email Editor Assistant" width="180" height="180" style="display: block; width: 100%; max-width: 180px; height: auto; border: 0;">
                  </td>
                  <td width="65%" valign="top">
                    <h2 style="margin: 0 0 15px 0; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: #4A9EFF; line-height: 1.3;">How to Use This Editor</h2>
                    <p style="margin: 0 0 15px 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #333333; line-height: 1.7;"><strong>AI Builder:</strong> Chat with our AI to generate and refine your email content. Simply describe what you want, and the AI will create it for you.</p>
                    <p style="margin: 0 0 15px 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #333333; line-height: 1.7;"><strong>Image Library:</strong> Add images from your library or upload new ones. The AI can also generate custom images based on your description.</p>
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #333333; line-height: 1.7;"><strong>HTML Editor:</strong> Edit the raw HTML directly for complete control, or use the inline editor to make quick text changes in the preview.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const templateData = {
      tenantId,
      name: data.name || 'Untitled Template',
      htmlContent: data.htmlContent || defaultHtmlContent,
      aiPrompt: data.aiPrompt || '',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      ...(userId && { createdBy: userId })
    };

    await templateRef.set(templateData);

    // Fetch the created document to return with actual timestamps
    const doc = await templateRef.get();
    const docData = doc.data();

    return {
      id: doc.id,
      tenantId: docData?.tenantId,
      name: docData?.name,
      htmlContent: docData?.htmlContent,
      aiPrompt: docData?.aiPrompt,
      status: docData?.status,
      createdAt: docData?.createdAt?.toDate() || new Date(),
      updatedAt: docData?.updatedAt?.toDate() || new Date(),
      createdBy: docData?.createdBy
    };
  } catch (error) {
    console.error('Error creating email template:', error);
    throw new Error('Failed to create email template');
  }
}
