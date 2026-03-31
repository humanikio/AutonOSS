import { db } from '../../../../config/firestore';
import { EmailTemplate } from './createEmailTemplate';

/**
 * Get all email templates for a tenant
 */
export async function getEmailTemplates(tenantId: string): Promise<EmailTemplate[]> {
  try {
    const templatesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .orderBy('updatedAt', 'desc')
      .get();

    const templates: EmailTemplate[] = [];

    templatesSnapshot.forEach(doc => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        tenantId: data.tenantId,
        name: data.name,
        htmlContent: data.htmlContent,
        aiPrompt: data.aiPrompt,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy
      });
    });

    return templates;
  } catch (error) {
    console.error('Error getting email templates:', error);
    throw new Error('Failed to get email templates');
  }
}
