/**
 * Update Cycle Service
 * Updates cycle status and timestamps
 * Cycles are immutable records - only status and timestamps can be updated
 */

import { firestore } from '../../../../../config/firebase';
import { Cycle, CycleStatus } from './createCycle';

export interface UpdateCycleInput {
  status?: CycleStatus;
  currentToDo?: string | null;  // Update which todo we're processing
  totalToDos?: number;          // Update total todos
  error?: string;               // Error message if failed
  metadata?: Record<string, any>;
}

/**
 * Update a cycle's status
 * Automatically sets appropriate timestamps based on status
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID to update
 * @param input - Update data
 * @returns The updated cycle or null if not found
 */
export async function updateCycle(
  tenantId: string,
  cycleId: string,
  input: UpdateCycleInput
): Promise<Cycle | null> {
  try {
    console.log(`= Updating cycle: ${cycleId} � ${input.status || 'metadata'}`);

    const cycleRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('cycles')
      .doc(cycleId);

    const doc = await cycleRef.get();

    if (!doc.exists) {
      console.log(`L Cycle not found: ${cycleId}`);
      return null;
    }

    const now = new Date();
    const updateData: any = {};

    // Update status if provided
    if (input.status) {
      updateData.status = input.status;

      // Set appropriate timestamp based on status
      if (input.status === 'completed') {
        updateData.completedAt = now;
        console.log(` Cycle ${cycleId} marked as completed`);
      } else if (input.status === 'failed') {
        updateData.failedAt = now;
        if (input.error) {
          updateData.error = input.error;
        }
        console.log(`L Cycle ${cycleId} marked as failed`);
      }
    }

    // Update currentToDo if provided
    if (input.currentToDo !== undefined) {
      updateData.currentToDo = input.currentToDo;
    }

    // Update totalToDos if provided
    if (input.totalToDos !== undefined) {
      updateData.totalToDos = input.totalToDos;
    }

    // Update error if provided
    if (input.error !== undefined) {
      updateData.error = input.error;
    }

    // Update metadata if provided
    if (input.metadata) {
      updateData.metadata = input.metadata;
    }

    await cycleRef.update(updateData);

    console.log(` Cycle updated: ${cycleId}`);

    // Fetch and return updated cycle
    const updatedDoc = await cycleRef.get();
    const data = updatedDoc.data() as Cycle;

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
    console.error('L Error updating cycle:', error);
    throw new Error('Failed to update cycle');
  }
}

/**
 * Mark a cycle as completed
 * Convenience method for setting status to 'completed'
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID
 * @returns The updated cycle
 */
export async function completeCycle(
  tenantId: string,
  cycleId: string
): Promise<Cycle | null> {
  return updateCycle(tenantId, cycleId, { status: 'completed' });
}

/**
 * Mark a cycle as failed
 * Convenience method for setting status to 'failed'
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID
 * @param error - Error message
 * @returns The updated cycle
 */
export async function failCycle(
  tenantId: string,
  cycleId: string,
  error?: string
): Promise<Cycle | null> {
  return updateCycle(tenantId, cycleId, { status: 'failed', error });
}
