/**
 * Update Workflow Service
 * Handles updating the n8n state holder workflow when event timestamps become misaligned
 *
 * TODO: This service will be implemented to sync n8n workflow state when event times change.
 *
 * INTENDED FUNCTIONALITY:
 * 1. Receive misaligned event details (old timestamp from n8n, new timestamp from DB)
 * 2. Call n8n API to update the workflow execution state with new timestamp
 * 3. Implement progressive retry logic (3 attempts with exponential backoff)
 * 4. Update milestone calculation based on new timestamp
 * 5. Return success/failure status
 *
 * RETRY STRATEGY:
 * - Attempt 1: Immediate
 * - Attempt 2: 2 seconds delay
 * - Attempt 3: 5 seconds delay
 *
 * If all retries fail, log the failure and do NOT send milestone notification
 * to prevent workflows from being triggered with outdated information.
 */

import { CalendarEvent } from '../eventManager/createEvent';

export interface UpdateWorkflowInput {
  tenantId: string;
  eventId: string;
  calendarId: string;
  event: CalendarEvent;
  oldTimestamp: Date;
  newTimestamp: Date;
  workflowExecutionId?: string; // n8n execution ID if available
}

export interface UpdateWorkflowResult {
  success: boolean;
  attempts: number;
  error?: string;
  updatedAt?: Date;
}

/**
 * Utility function to sleep for progressive delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Update n8n workflow state with new event timestamp
 * Implements 3-attempt retry with progressive backoff
 *
 * @param input - Update parameters
 * @returns Update result with attempt count
 */
export async function updateWorkflow(
  input: UpdateWorkflowInput
): Promise<UpdateWorkflowResult> {
  const { tenantId, eventId, calendarId, event, oldTimestamp, newTimestamp, workflowExecutionId } = input;

  console.log(`\n= Update Workflow Service (STUB - Not Yet Implemented)`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Calendar ID: ${calendarId}`);
  console.log(`   Old Timestamp: ${oldTimestamp.toISOString()}`);
  console.log(`   New Timestamp: ${newTimestamp.toISOString()}`);
  console.log(`   Workflow Execution ID: ${workflowExecutionId || 'N/A'}`);

  // Progressive retry delays (in milliseconds)
  const retryDelays = [0, 2000, 5000]; // Immediate, 2s, 5s
  let lastError: string | undefined;

  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    const attemptNumber = attempt + 1;

    console.log(`\n   Attempt ${attemptNumber}/${retryDelays.length}...`);

    // Apply delay before retry (skip for first attempt)
    if (attempt > 0) {
      console.log(`   ó Waiting ${retryDelays[attempt]}ms before retry...`);
      await sleep(retryDelays[attempt]);
    }

    try {
      // ========================================
      // TODO: IMPLEMENT n8n API CALL HERE
      // ========================================
      //
      // Steps to implement:
      // 1. Look up the n8n workflow execution by workflowExecutionId
      // 2. Call n8n API to update workflow execution state
      // 3. Update the stored timestamp for milestone calculations
      // 4. Verify the update was successful
      //
      // Example API call structure:
      // const response = await axios.patch(
      //   `${N8N_API_URL}/executions/${workflowExecutionId}`,
      //   {
      //     data: {
      //       appointmentTime: newTimestamp.toISOString(),
      //       eventId,
      //       calendarId,
      //       tenantId
      //     }
      //   },
      //   {
      //     headers: {
      //       'Authorization': `Bearer ${N8N_API_KEY}`,
      //       'Content-Type': 'application/json'
      //     }
      //   }
      // );
      //
      // if (response.status === 200) {
      //   return {
      //     success: true,
      //     attempts: attemptNumber,
      //     updatedAt: new Date()
      //   };
      // }
      // ========================================

      // Placeholder: Simulate failure for now
      lastError = 'n8n workflow update not yet implemented';
      console.log(`   L Attempt ${attemptNumber} failed: ${lastError}`);

    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`   L Attempt ${attemptNumber} failed:`, lastError);

      // If this is the last attempt, return failure
      if (attempt === retryDelays.length - 1) {
        console.log(`\n     All ${retryDelays.length} attempts exhausted. Giving up.`);
        return {
          success: false,
          attempts: retryDelays.length,
          error: `Failed after ${retryDelays.length} attempts: ${lastError}`
        };
      }

      // Otherwise, continue to next retry
      console.log(`   = Will retry...`);
    }
  }

  // Fallback return (should not reach here, but for safety)
  return {
    success: false,
    attempts: retryDelays.length,
    error: `All retry attempts failed: ${lastError}`
  };
}
