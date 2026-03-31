import { db } from '../../../../../config/firestore';
import { Task, TaskStatus, TaskType } from './createTask';

export interface GetTasksOptions {
  status?: TaskStatus | TaskStatus[];
  type?: TaskType | TaskType[];
  limit?: number;
  orderBy?: 'priority' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Get tasks for a cycle with flexible filtering
 *
 * @param tenantId - Tenant ID
 * @param templateId - Template ID
 * @param cycleId - Cycle ID
 * @param options - Filter options
 * @returns Array of tasks matching filters
 *
 * @example
 * // Get pending tasks ordered by priority
 * getTasks(t, t, c, { status: 'pending', orderBy: 'priority', orderDirection: 'desc' })
 *
 * @example
 * // Get all completed imageGeneration tasks
 * getTasks(t, t, c, { status: 'completed', type: 'imageGeneration' })
 *
 * @example
 * // Get all tasks
 * getTasks(t, t, c)
 */
export async function getTasks(
  tenantId: string,
  templateId: string,
  cycleId: string,
  options: GetTasksOptions = {}
): Promise<Task[]> {
  try {
    let query: any = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc(cycleId)
      .collection('tasks');

    // Apply status filter
    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.where('status', 'in', options.status);
      } else {
        query = query.where('status', '==', options.status);
      }
    }

    // Apply type filter
    if (options.type) {
      if (Array.isArray(options.type)) {
        query = query.where('type', 'in', options.type);
      } else {
        query = query.where('type', '==', options.type);
      }
    }

    // Apply ordering
    const orderByField = options.orderBy || 'priority';
    const orderDirection = options.orderDirection || 'desc';
    query = query.orderBy(orderByField, orderDirection);

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();

    const tasks: Task[] = [];

    snapshot.forEach((doc: any) => {
      if (doc.id === 'main') return; // Skip the main document

      const data = doc.data();
      tasks.push({
        id: doc.id,
        tenantId: data.tenantId,
        templateId: data.templateId,
        cycleId: data.cycleId,
        type: data.type,
        status: data.status as TaskStatus,
        priority: data.priority,
        parameters: data.parameters,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate(),
        result: data.result,
        error: data.error
      });
    });

    return tasks;
  } catch (error) {
    console.error('[Get Tasks] Error fetching tasks:', error);
    throw new Error(
      `Failed to get tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Helper: Get pending tasks ordered by priority (highest first)
 */
export async function getPendingTasks(
  tenantId: string,
  templateId: string,
  cycleId: string
): Promise<Task[]> {
  return getTasks(tenantId, templateId, cycleId, {
    status: 'pending',
    orderBy: 'priority',
    orderDirection: 'desc'
  });
}

/**
 * Helper: Get completed tasks
 */
export async function getCompletedTasks(
  tenantId: string,
  templateId: string,
  cycleId: string
): Promise<Task[]> {
  return getTasks(tenantId, templateId, cycleId, {
    status: 'completed',
    orderBy: 'createdAt',
    orderDirection: 'asc'
  });
}

/**
 * Helper: Get all tasks for a cycle
 */
export async function getAllTasks(
  tenantId: string,
  templateId: string,
  cycleId: string
): Promise<Task[]> {
  return getTasks(tenantId, templateId, cycleId, {
    orderBy: 'priority',
    orderDirection: 'desc'
  });
}
