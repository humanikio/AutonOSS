/**
 * Create ToDo Service
 * Creates sequential todos within a cycle
 */

import { firestore } from '../../../../../config/firebase';
import { updateCycle } from '../cycles/updateCycle';

export type ToDoStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ToDo {
  todoId: string;              // 'todo_1', 'todo_2', etc.
  cycleId: string;
  toolName: string;            // 'eventTool' | 'taskTool'
  intent: string;              // What this tool should do
  context: Record<string, any>; // Parameters from brain
  status: ToDoStatus;
  retryCount: number;          // 0, 1, or 2
  result?: any;                // Result from tool execution
  error?: string;              // Error message if failed
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export interface CreateToDoInput {
  toolName: string;
  intent: string;
  context: Record<string, any>;
}

/**
 * Create a new todo in the cycle
 * Automatically increments todo number (todo_1, todo_2, etc.)
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID
 * @param input - ToDo creation data
 * @returns The created todo
 */
export async function createToDo(
  tenantId: string,
  cycleId: string,
  input: CreateToDoInput
): Promise<ToDo> {
  try {
    const now = new Date();

    // Get current totalToDos from cycle to determine next ID
    const cycleRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('cycles')
      .doc(cycleId);

    const cycleDoc = await cycleRef.get();

    if (!cycleDoc.exists) {
      throw new Error(`Cycle not found: ${cycleId}`);
    }

    const cycleData = cycleDoc.data();
    const currentTotal = cycleData?.totalToDos || 0;
    const nextTodoNumber = currentTotal + 1;
    const todoId = `todo_${nextTodoNumber}`;

    console.log(`=Ý Creating ${todoId} for cycle ${cycleId}: ${input.toolName}`);

    const todo: ToDo = {
      todoId,
      cycleId,
      toolName: input.toolName,
      intent: input.intent,
      context: input.context,
      status: 'pending',
      retryCount: 0,
      createdAt: now
    };

    const todoRef = cycleRef.collection('toDos').doc(todoId);
    await todoRef.set(todo);

    // Update cycle's totalToDos
    await updateCycle(tenantId, cycleId, {
      totalToDos: nextTodoNumber
    });

    console.log(` ToDo created: ${todoId}`);

    return todo;
  } catch (error) {
    console.error('L Error creating todo:', error);
    throw new Error('Failed to create todo');
  }
}
