/**
 * Cycle Watcher Utility
 * Watches orchestrator execution and auto-updates cycle status
 * Mounted in the request orchestrator to track cycle lifecycle
 */

import { updateCycle, completeCycle, failCycle } from '../cycles/updateCycle';
import { getCurrentState } from './getCurrentState';

export interface CycleWatcherResult {
  success: boolean;
  cycleId: string | null;
  finalStatus: 'completed' | 'failed' | null;
  error?: string;
}

/**
 * Watch an orchestrator execution and update cycle status
 * Use this as a wrapper around your orchestrator logic
 *
 * @param tenantId - The tenant ID
 * @param orchestratorFn - The orchestrator function to execute
 * @returns Result with cycle status
 */
export async function watchCycle<T>(
  tenantId: string,
  orchestratorFn: () => Promise<T>
): Promise<{ result: T; watcher: CycleWatcherResult }> {
  let cycleId: string | null = null;

  try {
    // Get current cycle ID
    const state = await getCurrentState(tenantId);
    cycleId = state.currentCycleId;

    if (!cycleId) {
      console.log(`  No current cycle set for tenant ${tenantId}`);
    }

    console.log(`=A Cycle Watcher: Monitoring cycle ${cycleId}`);

    // Execute the orchestrator
    const result = await orchestratorFn();

    // Success! Mark cycle as completed
    if (cycleId) {
      await completeCycle(tenantId, cycleId);
      console.log(` Cycle Watcher: Cycle ${cycleId} completed`);
    }

    return {
      result,
      watcher: {
        success: true,
        cycleId,
        finalStatus: 'completed'
      }
    };
  } catch (error: any) {
    // Failure! Mark cycle as failed
    const errorMessage = error?.message || 'Unknown error';

    if (cycleId) {
      await failCycle(tenantId, cycleId, errorMessage);
      console.log(`L Cycle Watcher: Cycle ${cycleId} failed - ${errorMessage}`);
    }

    return {
      result: null as any,
      watcher: {
        success: false,
        cycleId,
        finalStatus: 'failed',
        error: errorMessage
      }
    };
  }
}

/**
 * Complete the current cycle manually
 * Used when you need to explicitly mark a cycle as completed
 *
 * @param tenantId - The tenant ID
 * @returns True if successful
 */
export async function completeCurrentCycle(tenantId: string): Promise<boolean> {
  try {
    const state = await getCurrentState(tenantId);

    if (!state.currentCycleId) {
      console.log(`  No current cycle to complete for tenant ${tenantId}`);
      return false;
    }

    await completeCycle(tenantId, state.currentCycleId);
    console.log(` Current cycle ${state.currentCycleId} completed`);

    return true;
  } catch (error) {
    console.error('L Error completing current cycle:', error);
    return false;
  }
}

/**
 * Fail the current cycle manually
 * Used when you need to explicitly mark a cycle as failed
 *
 * @param tenantId - The tenant ID
 * @param error - Error message
 * @returns True if successful
 */
export async function failCurrentCycle(
  tenantId: string,
  error?: string
): Promise<boolean> {
  try {
    const state = await getCurrentState(tenantId);

    if (!state.currentCycleId) {
      console.log(`  No current cycle to fail for tenant ${tenantId}`);
      return false;
    }

    await failCycle(tenantId, state.currentCycleId, error);
    console.log(`L Current cycle ${state.currentCycleId} failed: ${error}`);

    return true;
  } catch (error) {
    console.error('L Error failing current cycle:', error);
    return false;
  }
}
