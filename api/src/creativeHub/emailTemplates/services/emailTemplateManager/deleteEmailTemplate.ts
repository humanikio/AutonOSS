import { db } from '../../../../config/firestore';

/**
 * Delete an email template
 */
export async function deleteEmailTemplate(
  tenantId: string,
  templateId: string
): Promise<void> {
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

    // Delete the template
    await templateRef.delete();

    console.log(`Email template ${templateId} deleted successfully for tenant ${tenantId}`);
  } catch (error) {
    console.error('Error deleting email template:', error);
    throw error;
  }
}
