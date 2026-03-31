import { db } from '../../../../../config/firestore';

/**
 * Delete a task
 *
 * @param tenantId - Tenant ID
 * @param templateId - Template ID
 * @param cycleId - Cycle ID
 * @param taskId - Task ID
 * @returns void
 */
export async function deleteTask(
  tenantId: string,
  templateId: string,
  cycleId: string,
  taskId: string
): Promise<void> {
  try {
    console.log(`[Delete Task] Deleting task ${taskId}`);

    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc(cycleId)
      .collection('tasks')
      .doc(taskId)
      .delete();

    console.log(`[Delete Task]  Task deleted: ${taskId}`);
  } catch (error) {
    console.error('[Delete Task] Error deleting task:', error);
    throw new Error('Failed to delete task');
  }
}
