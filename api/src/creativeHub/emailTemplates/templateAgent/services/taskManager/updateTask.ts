import { db } from '../../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { TaskStatus } from './createTask';

export interface UpdateTaskInput {
  tenantId: string;
  templateId: string;
  cycleId: string;
  taskId: string;
  status?: TaskStatus;
  result?: any;
  error?: string;
}

/**
 * Update a task
 *
 * @param input - Update parameters
 * @returns void
 */
export async function updateTask(input: UpdateTaskInput): Promise<void> {
  const { tenantId, templateId, cycleId, taskId, status, result, error } = input;

  try {
    console.log(`[Update Task] Updating task ${taskId}`);

    const taskRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc(cycleId)
      .collection('tasks')
      .doc(taskId);

    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp()
    };

    if (status) {
      updateData.status = status;

      // If status is completed, set completedAt timestamp
      if (status === 'completed') {
        updateData.completedAt = FieldValue.serverTimestamp();
        console.log(`[Update Task] Marking task as completed`);
      }
    }

    if (result !== undefined) {
      updateData.result = result;
    }

    if (error !== undefined) {
      updateData.error = error;
    }

    await taskRef.update(updateData);

    console.log(`[Update Task]  Task updated: ${taskId}`);
  } catch (error) {
    console.error('[Update Task] Error updating task:', error);
    throw new Error('Failed to update task');
  }
}
