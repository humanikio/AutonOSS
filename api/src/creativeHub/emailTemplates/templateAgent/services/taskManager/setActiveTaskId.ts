import { db } from '../../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Set the active task ID in the main document
 *
 * @param tenantId - Tenant ID
 * @param templateId - Template ID
 * @param cycleId - Cycle ID
 * @param taskId - Task ID to set as active (or null to clear)
 * @returns void
 */
export async function setActiveTaskId(
  tenantId: string,
  templateId: string,
  cycleId: string,
  taskId: string | null
): Promise<void> {
  try {
    console.log(`[Set Active Task] Setting active task to: ${taskId || 'none'}`);

    const mainRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc(cycleId)
      .collection('tasks')
      .doc('main');

    await mainRef.set(
      {
        activeTaskId: taskId,
        lastUpdated: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    console.log(`[Set Active Task] ✓ Active task updated`);
  } catch (error) {
    console.error('[Set Active Task] Error setting active task ID:', error);
    throw new Error('Failed to set active task ID');
  }
}
