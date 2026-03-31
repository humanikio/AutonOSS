import { db } from '../../../../../config/firestore';

/**
 * Get the currently active cycle ID for a template
 */
export async function getActiveCycleId(
  tenantId: string,
  templateId: string
): Promise<string | null> {
  try {
    const mainDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc('main')
      .get();

    if (!mainDoc.exists) {
      return null;
    }

    const data = mainDoc.data();
    return data?.currentCycleId || null;
  } catch (error) {
    console.error('Error getting active cycle ID:', error);
    throw new Error('Failed to get active cycle ID');
  }
}
