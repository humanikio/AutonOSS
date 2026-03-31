import { db } from '../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { EmailTemplate } from './createEmailTemplate';

export interface UpdateEmailTemplateData {
  name?: string;
  htmlContent?: string;
  aiPrompt?: string;
  status?: 'draft' | 'published';
}

/**
 * Update an email template
 */
export async function updateEmailTemplate(
  tenantId: string,
  templateId: string,
  data: UpdateEmailTemplateData
): Promise<EmailTemplate> {
  try {
    const templateRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId);

    // Check if template exists
    const templateDoc = await templateRef.get();
    if (!templateDoc.exists) {
      throw new Error('Email template not found');
    }

    // Update only provided fields
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.htmlContent !== undefined) updateData.htmlContent = data.htmlContent;
    if (data.aiPrompt !== undefined) updateData.aiPrompt = data.aiPrompt;
    if (data.status !== undefined) updateData.status = data.status;

    await templateRef.update(updateData);

    // Fetch updated document
    const updatedDoc = await templateRef.get();
    const updatedData = updatedDoc.data();

    if (!updatedData) {
      throw new Error('Failed to retrieve updated template');
    }

    return {
      id: updatedDoc.id,
      tenantId: updatedData.tenantId,
      name: updatedData.name,
      htmlContent: updatedData.htmlContent,
      aiPrompt: updatedData.aiPrompt,
      status: updatedData.status,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      createdBy: updatedData.createdBy
    };
  } catch (error) {
    console.error('Error updating email template:', error);
    throw error;
  }
}
