import { db } from '../../../../../config/firestore';

/**
 * Get the currently active task ID from the main document
 *
 * @param tenantId - Tenant ID
 * @param templateId - Template ID
 * @param cycleId - Cycle ID
 * @returns Active task ID or null if none
 */
export async function getActiveTaskId(
  tenantId: string,
  templateId: string,
  cycleId: string
): Promise<string | null> {
  try {
    const mainDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc(cycleId)
      .collection('tasks')
      .doc('main')
      .get();

    if (!mainDoc.exists) {
      console.log('[Get Active Task] Main document does not exist');
      return null;
    }

    const data = mainDoc.data();
    const activeTaskId = data?.activeTaskId || null;

    console.log(`[Get Active Task] Active task ID: ${activeTaskId || 'none'}`);
    return activeTaskId;
  } catch (error) {
    console.error('[Get Active Task] Error getting active task ID:', error);
    throw new Error('Failed to get active task ID');
  }
}
