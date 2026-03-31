import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export type TaskType = 'imageGeneration' | 'htmlGeneration' | 'clarification';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Task {
  id: string;
  tenantId: string;
  templateId: string;
  cycleId: string;
  type: TaskType;
  status: TaskStatus;
  priority: number; // Higher number = higher priority
  parameters: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export interface CreateTaskInput {
  tenantId: string;
  templateId: string;
  cycleId: string;
  type: TaskType;
  parameters: Record<string, any>;
  makeActiveTask?: boolean; // If true, set this as the active task
}

/**
 * Task priority mapping
 * Higher numbers = higher priority
 */
const TASK_PRIORITIES: Record<TaskType, number> = {
  imageGeneration: 100, // Highest priority - must run first
  clarification: 90, // High priority - needs user input
  htmlGeneration: 50 // Lower priority - runs after images
};

/**
 * Create a new task for an agent cycle
 *
 * @param input - Task creation parameters
 * @returns Created task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { tenantId, templateId, cycleId, type, parameters, makeActiveTask = false } = input;

  try {
    console.log(`[Create Task] Creating ${type} task for cycle ${cycleId}`);
    console.log(`[Create Task] Make active: ${makeActiveTask}`);

    // Generate unique task ID
    const taskId = uuidv4();

    // Get priority for this task type
    const priority = TASK_PRIORITIES[type];

    // Create task document reference
    const taskRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc(cycleId)
      .collection('tasks')
      .doc(taskId);

    // Task data
    const taskData = {
      id: taskId,
      tenantId,
      templateId,
      cycleId,
      type,
      status: 'pending' as TaskStatus,
      priority,
      parameters,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // Write task to Firestore
    await taskRef.set(taskData);

    console.log(`[Create Task]  Task created: ${taskId}`);

    // If makeActiveTask is true, update the main document
    if (makeActiveTask) {
      console.log(`[Create Task] Setting ${taskId} as active task`);

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

      console.log(`[Create Task]  Active task updated to ${taskId}`);
    }

    // Return task with current timestamp
    return {
      ...taskData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Task;
  } catch (error) {
    console.error('[Create Task] Error creating task:', error);
    throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
