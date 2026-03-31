import { db } from '../../../../../config/firestore';
import { Task } from './createTask';

/**
 * Read a task by ID
 *
 * @param tenantId - Tenant ID
 * @param templateId - Template ID
 * @param cycleId - Cycle ID
 * @param taskId - Task ID
 * @returns Task or null if not found
 */
export async function readTask(
  tenantId: string,
  templateId: string,
  cycleId: string,
  taskId: string
): Promise<Task | null> {
  try {
    const taskDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc(cycleId)
      .collection('tasks')
      .doc(taskId)
      .get();

    if (!taskDoc.exists) {
      console.log(`[Read Task] Task not found: ${taskId}`);
      return null;
    }

    const data = taskDoc.data();
    if (!data) {
      return null;
    }

    return {
      id: taskDoc.id,
      tenantId: data.tenantId,
      templateId: data.templateId,
      cycleId: data.cycleId,
      type: data.type,
      status: data.status,
      priority: data.priority,
      parameters: data.parameters || {},
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      completedAt: data.completedAt?.toDate(),
      result: data.result,
      error: data.error
    };
  } catch (error) {
    console.error('[Read Task] Error reading task:', error);
    throw new Error('Failed to read task');
  }
}
