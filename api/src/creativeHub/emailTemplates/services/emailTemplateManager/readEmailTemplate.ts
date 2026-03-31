import { db } from '../../../../config/firestore';
import { EmailTemplate } from './createEmailTemplate';

/**
 * Read a single email template by ID
 */
export async function readEmailTemplate(
  tenantId: string,
  templateId: string
): Promise<EmailTemplate | null> {
  try {
    const templateDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .get();

    if (!templateDoc.exists) {
      return null;
    }

    const data = templateDoc.data();
    if (!data) {
      return null;
    }

    return {
      id: templateDoc.id,
      tenantId: data.tenantId,
      name: data.name,
      htmlContent: data.htmlContent || '',
      aiPrompt: data.aiPrompt,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy
    };
  } catch (error) {
    console.error('Error reading email template:', error);
    throw new Error('Failed to read email template');
  }
}
