/**
 * Get ToDo Service
 * Retrieves todos from a cycle
 */

import { firestore } from '../../../../../config/firebase';
import { ToDo } from './createToDo';

/**
 * Get current todo being processed
 * Uses cycle's currentToDo field
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID
 * @returns The current todo or null
 */
export async function getCurrentToDo(
  tenantId: string,
  cycleId: string
): Promise<ToDo | null> {
  try {
    // Get cycle to find currentToDo
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
      return null;
    }

    const cycleData = cycleDoc.data();
    const currentTodoId = cycleData?.currentToDo;

    if (!currentTodoId) {
      return null;
    }

    // Get the todo
    const todoRef = cycleRef.collection('toDos').doc(currentTodoId);
    const todoDoc = await todoRef.get();

    if (!todoDoc.exists) {
      return null;
    }

    const data = todoDoc.data() as ToDo;

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
    console.error('L Error getting current todo:', error);
    throw new Error('Failed to get current todo');
  }
}

/**
 * Get a specific todo by ID
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID
 * @param todoId - The todo ID
 * @returns The todo or null
 */
export async function getToDo(
  tenantId: string,
  cycleId: string,
  todoId: string
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

    const data = todoDoc.data() as ToDo;

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
    console.error('L Error getting todo:', error);
    throw new Error('Failed to get todo');
  }
}

/**
 * Get next pending todo
 * Finds the first todo with status 'pending'
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID
 * @returns The next todo or null
 */
export async function getNextToDo(
  tenantId: string,
  cycleId: string
): Promise<ToDo | null> {
  try {
    const todosRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('cycles')
      .doc(cycleId)
      .collection('toDos');

    const snapshot = await todosRef
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const data = snapshot.docs[0].data() as ToDo;

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
    console.error('L Error getting next todo:', error);
    throw new Error('Failed to get next todo');
  }
}
