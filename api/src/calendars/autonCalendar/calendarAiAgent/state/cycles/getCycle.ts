/**
 * Get Cycle Service
 * Retrieves cycle records
 */

import { firestore } from '../../../../../config/firebase';
import { getCurrentState } from '../utils/getCurrentState';
import { Cycle } from './createCycle';

/**
 * Get the currently active cycle
 * Uses getCurrentState util to find the current cycleId
 *
 * @param tenantId - The tenant ID
 * @returns The current cycle or null if no cycle is active
 */
export async function getCurrentCycle(tenantId: string): Promise<Cycle | null> {
  try {
    // Get current state to find active cycle ID
    const state = await getCurrentState(tenantId);

    if (!state.currentCycleId) {
      console.log(`ℹ️ No current cycle set for tenant ${tenantId}`);
      return null;
    }

    return getCycle(tenantId, state.currentCycleId);
  } catch (error) {
    console.error('❌ Error getting current cycle:', error);
    throw new Error('Failed to get current cycle');
  }
}

/**
 * Get a specific cycle by ID
 *
 * @param tenantId - The tenant ID
 * @param cycleId - The cycle ID
 * @returns The cycle or null if not found
 */
export async function getCycle(
  tenantId: string,
  cycleId: string
): Promise<Cycle | null> {
  try {
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
      console.log(`❌ Cycle not found: ${cycleId}`);
      return null;
    }

    const data = doc.data() as Cycle;

    // Convert Firestore Timestamps to Date objects
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
    console.error('❌ Error getting cycle:', error);
    throw new Error('Failed to get cycle');
  }
}

/**
 * List all cycles for a tenant
 * Ordered by most recently created
 *
 * @param tenantId - The tenant ID
 * @param limit - Optional limit for pagination
 * @returns Array of cycles
 */
export async function listCycles(
  tenantId: string,
  limit?: number
): Promise<Cycle[]> {
  try {
    console.log(`📋 Listing cycles for tenant: ${tenantId}`);

    let query = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('cycles')
      .orderBy('createdAt', 'desc');

    if (limit) {
      query = query.limit(limit) as any;
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log(`ℹ️ No cycles found for tenant ${tenantId}`);
      return [];
    }

    const cycles: Cycle[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Cycle;
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
    });

    console.log(`✅ Found ${cycles.length} cycles for tenant ${tenantId}`);

    return cycles;
  } catch (error) {
    console.error('❌ Error listing cycles:', error);
    throw new Error('Failed to list cycles');
  }
}
