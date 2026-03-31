/**
 * Update ToDo Service
 * Updates todo status, handles retries, and advances queue
 */

import { firestore } from '../../../../../config/firebase';
import { updateCycle } from '../cycles/updateCycle';
import { ToDo, ToDoStatus } from './createToDo';
import { getNextToDo } from './getToDo';

export interface UpdateToDoInput {
  status?: ToDoStatus;
  result?: any;
  error?: string;
  retryCount?: number;
}

/**
 * Update a todo's status and data
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID
 * @param todoId - The todo ID
 * @param input - Update data
 * @returns The updated todo
 */
export async function updateToDo(
  tenantId: string,
  cycleId: string,
  todoId: string,
  input: UpdateToDoInput
): Promise<ToDo | null> {
  try {
    const todoRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('cycles')
      .doc(cycleId)
      .collection('toDos')
      .doc(todoId);

    const todoDoc = await todoRef.get();

    if (!todoDoc.exists) {
      return null;
    }

    const now = new Date();
    const updateData: any = {};

    // Update status
    if (input.status) {
      updateData.status = input.status;

      // Set timestamps based on status
      if (input.status === 'processing') {
        updateData.startedAt = now;
      } else if (input.status === 'completed') {
        updateData.completedAt = now;
      } else if (input.status === 'failed') {
        updateData.failedAt = now;
      }
    }

    // Update result
    if (input.result !== undefined) {
      updateData.result = input.result;
    }

    // Update error
    if (input.error !== undefined) {
      updateData.error = input.error;
    }

    // Update retry count
    if (input.retryCount !== undefined) {
      updateData.retryCount = input.retryCount;
    }

    await todoRef.update(updateData);

    const updatedDoc = await todoRef.get();
    const data = updatedDoc.data() as ToDo;

    return {
      ...data,
      createdAt: data.createdAt instanceof Date
        ? data.createdAt
        : (data.createdAt as any).toDate(),
      startedAt: data.startedAt
        ? (data.startedAt instanceof Date ? data.startedAt : (data.startedAt as any).toDate())
        : undefined,
      completedAt: data.completedAt
        ? (data.completedAt instanceof Date ? data.completedAt : (data.completedAt as any).toDate())
        : undefined,
      failedAt: data.failedAt
        ? (data.failedAt instanceof Date ? data.failedAt : (data.failedAt as any).toDate())
        : undefined
    };
  } catch (error) {
    console.error('L Error updating todo:', error);
    throw new Error('Failed to update todo');
  }
}

/**
 * Mark todo as processing
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID
 * @param todoId - The todo ID
 */
export async function markToDoProcessing(
  tenantId: string,
  cycleId: string,
  todoId: string
): Promise<void> {
  console.log(`™  Processing ${todoId}`);
  await updateToDo(tenantId, cycleId, todoId, { status: 'processing' });
}

/**
 * Complete a todo and advance to next
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID
 * @param todoId - The todo ID
 * @param result - Result from tool execution
 */
export async function completeToDoAndAdvance(
  tenantId: string,
  cycleId: string,
  todoId: string,
  result: any
): Promise<void> {
  console.log(` Completed ${todoId}`);

  // Mark current todo as completed
  await updateToDo(tenantId, cycleId, todoId, {
    status: 'completed',
    result
  });

  // Find next pending todo
  const nextTodo = await getNextToDo(tenantId, cycleId);

  // Update cycle's currentToDo
  await updateCycle(tenantId, cycleId, {
    currentToDo: nextTodo ? nextTodo.todoId : null
  });

  if (nextTodo) {
    console.log(`¡  Next todo: ${nextTodo.todoId}`);
  } else {
    console.log(` All todos completed for cycle ${cycleId}`);
  }
}

/**
 * Fail a todo and retry or skip
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID
 * @param todoId - The todo ID
 * @param error - Error message
 */
export async function handleToDoFailure(
  tenantId: string,
  cycleId: string,
  todoId: string,
  error: string
): Promise<void> {
  const todoRef = firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('calendars')
    .doc('autonCalendar')
    .collection('aiAgent')
    .doc('main')
    .collection('cycles')
    .doc(cycleId)
    .collection('toDos')
    .doc(todoId);

  const todoDoc = await todoRef.get();
  const todoData = todoDoc.data() as ToDo;
  const retryCount = todoData.retryCount || 0;

  if (retryCount < 1) {
    // Retry once
    console.log(`= Retrying ${todoId} (attempt ${retryCount + 2})`);
    await updateToDo(tenantId, cycleId, todoId, {
      status: 'pending',
      retryCount: retryCount + 1,
      error
    });
  } else {
    // Failed twice - skip to next
    console.log(`L Failed ${todoId} after 2 attempts - skipping`);
    await updateToDo(tenantId, cycleId, todoId, {
      status: 'failed',
      error
    });

    // Advance to next todo
    const nextTodo = await getNextToDo(tenantId, cycleId);
    await updateCycle(tenantId, cycleId, {
      currentToDo: nextTodo ? nextTodo.todoId : null
    });
  }
}
