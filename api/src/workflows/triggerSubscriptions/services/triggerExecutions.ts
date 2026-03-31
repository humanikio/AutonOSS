/**
 * Trigger Execution Engine
 * Orchestrates the execution of trigger subscriptions
 *
 * Flow:
 * 1. Receive tenantId, triggerType, payload
 * 2. Query active subscriptions (filtered by conditions: value, eventId, etc.)
 * 3. If none found, return success (no workflows to trigger)
 * 4. Queue subscriptions in local memory
 * 5. For each subscription:
 *    a. Check if trigger uses resumeUrl (wait nodes)
 *    b. If resumeUrl: Use subscription.resumeUrl, POST to resume, mark resumed, delete subscription
 *    c. If webhook: Read workflow, get webhook URL, POST to webhook
 *    d. Validate payload against schema (in sendPayload)
 * 6. Return execution results
 *
 * Wait Subscription Pattern:
 * - Multiple parallel waits on same milestone = ALL resume (correct behavior)
 * - Different milestones = only matching ones resume (condition filtering)
 * - Wait subscriptions are one-time use and deleted after successful resume
 */

import { callGetSubscriptions } from './triggerExecutions/tools/callGetSubscriptions';
import { callReadWorkflow } from './triggerExecutions/tools/callReadWorkflow';
import { structurePayload } from './triggerExecutions/structurePayload';
import { sendPayload } from './triggerExecutions/sendPayload';
import {
  saveQueueLocalMemory,
  markProcessing,
  markCompleted,
  markFailed,
  getQueueSummary
} from './triggerExecutions/saveQueueLocalMemory';
import { TriggerDestinationRegistry } from './TriggerDesitinationRegistry/index';
import { deleteWaitSubscription } from './waitSubscriptionManager/deleteWaitSubscription';

export interface TriggerExecutionInput {
  tenantId: string;
  triggerType: string;
  payload: Record<string, any>;
}

export interface TriggerExecutionResult {
  success: boolean;
  message: string;
  subscriptionsFound: number;
  executionResults: Array<{
    subscriptionId: string;
    workflowId: string;
    success: boolean;
    error?: string;
  }>;
  summary: {
    total: number;
    completed: number;
    failed: number;
  };
}

/**
 * Execute trigger subscriptions for a given event
 *
 * Can be called via:
 * - HTTP route (authenticated)
 * - Direct function call from code
 */
export async function executeTrigger(
  input: TriggerExecutionInput
): Promise<TriggerExecutionResult> {
  const { tenantId, triggerType, payload } = input;

  console.log(`\n======== TRIGGER EXECUTION START ========`);
  console.log(`   TenantId: ${tenantId}`);
  console.log(`   TriggerType: ${triggerType}`);
  console.log(`   Payload keys: ${Object.keys(payload).join(', ')}`);

  // Step 1: Validate payload structure first
  console.log(`\nSTEP 1: Validating payload structure`);
  const payloadValidation = structurePayload({ triggerType, payload });

  if (!payloadValidation.valid) {
    console.error(`Payload validation failed`);
    return {
      success: false,
      message: `Invalid payload: ${payloadValidation.errors.join(', ')}`,
      subscriptionsFound: 0,
      executionResults: [],
      summary: { total: 0, completed: 0, failed: 0 }
    };
  }

  // Step 2: Get active subscriptions
  console.log(`\nSTEP 2: Fetching active subscriptions`);
  const subscriptionsResult = await callGetSubscriptions({
    tenantId,
    triggerType,
    payload: payloadValidation.payload, // Pass payload for condition filtering
    verbose: false // Set to true for detailed condition logging
  });

  // If no subscriptions found, return success (nothing to execute)
  if (subscriptionsResult.count === 0) {
    console.log(`No active subscriptions found for ${triggerType}`);
    console.log(`======== TRIGGER EXECUTION COMPLETE ========\n`);
    return {
      success: true,
      message: 'No active subscriptions found for this trigger type',
      subscriptionsFound: 0,
      executionResults: [],
      summary: { total: 0, completed: 0, failed: 0 }
    };
  }

  // Step 3: Queue subscriptions in memory
  console.log(`\nSTEP 3: Queueing subscriptions for execution`);
  const queue = saveQueueLocalMemory(subscriptionsResult.subscriptions);

  const executionResults: Array<{
    subscriptionId: string;
    workflowId: string;
    success: boolean;
    error?: string;
  }> = [];

  // Step 4: Check if this trigger type uses resumeUrl (wait nodes)
  console.log(`\nSTEP 4: Checking trigger type metadata`);
  const triggerDef = TriggerDestinationRegistry.getEventDefinition(triggerType);
  const usesResumeUrl = triggerDef?.metadata?.usesResumeUrl || false;

  if (usesResumeUrl) {
    console.log(`   ⏸️  Trigger uses resumeUrl (wait node pattern)`);
  } else {
    console.log(`   🌐 Trigger uses webhook pattern (standard)`);
  }

  // Step 5: Process each subscription in queue
  console.log(`\nSTEP 5: Processing ${queue.totalCount} subscription(s)\n`);

  for (let i = 0; i < queue.items.length; i++) {
    const queueItem = queue.items[i];
    const subscription = queueItem.subscription;

    console.log(`\n--- Processing subscription ${i + 1}/${queue.totalCount} ---`);
    console.log(`   Subscription ID: ${subscription.id}`);
    console.log(`   Workflow ID: ${subscription.workflowId}`);

    markProcessing(queue, i);

    try {
      let targetUrl: string;
      let executionId: string | undefined;

      if (usesResumeUrl) {
        // === WAIT NODE PATTERN: Use resumeUrl from subscription (root level) ===
        console.log(`   Step 5a: Reading resumeUrl from subscription...`);

        // Wait subscriptions store resumeUrl and executionId at root level
        const waitSubscription = subscription as any;

        if (!waitSubscription?.resumeUrl || !waitSubscription?.executionId) {
          const error = 'Wait subscription missing resumeUrl or executionId';
          console.error(`   ❌ ${error}`);
          markFailed(queue, i, error);
          executionResults.push({
            subscriptionId: subscription.id,
            workflowId: subscription.workflowId,
            success: false,
            error
          });
          continue;
        }

        targetUrl = waitSubscription.resumeUrl;
        executionId = waitSubscription.executionId;
        console.log(`   ✅ Found resumeUrl for execution: ${executionId}`);

      } else {
        // === WEBHOOK PATTERN: Read workflow and get webhook URL ===
        console.log(`   Step 5a: Reading workflow...`);
        const workflowResult = await callReadWorkflow({
          tenantId: subscription.tenantId,
          workflowId: subscription.workflowId
        });

        if (!workflowResult.success || !workflowResult.webhookUrl) {
          const error = 'No webhook URL found - workflow may not be public/synced to n8n';
          console.error(`   ❌ ${error}`);
          markFailed(queue, i, error);
          executionResults.push({
            subscriptionId: subscription.id,
            workflowId: subscription.workflowId,
            success: false,
            error
          });
          continue;
        }

        targetUrl = workflowResult.webhookUrl;
        console.log(`   ✅ Found webhook URL`);
      }

      // Step 5b: Send payload to target URL
      console.log(`   Step 5b: Sending payload to ${usesResumeUrl ? 'resumeUrl' : 'webhook'}...`);
      const sendResult = await sendPayload({
        webhookUrl: targetUrl,
        payload: payloadValidation.payload,
        workflowId: subscription.workflowId,
        subscriptionId: subscription.id
      });

      if (sendResult.success) {
        console.log(`   ✅ Execution completed successfully`);

        // Cleanup wait subscription if using resumeUrl (one-time use)
        if (usesResumeUrl) {
          await deleteWaitSubscription({
            tenantId: subscription.tenantId,
            workflowId: subscription.workflowId,
            subscriptionId: subscription.id
          });
          console.log(`   ✅ Deleted wait subscription ${subscription.id}`);
        }

        markCompleted(queue, i);
        executionResults.push({
          subscriptionId: subscription.id,
          workflowId: subscription.workflowId,
          success: true
        });
      } else {
        console.error(`   ❌ Execution failed: ${sendResult.error}`);
        markFailed(queue, i, sendResult.error || 'Unknown error');
        executionResults.push({
          subscriptionId: subscription.id,
          workflowId: subscription.workflowId,
          success: false,
          error: sendResult.error
        });
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error during execution';
      console.error(`   ❌ Unexpected error: ${errorMessage}`);
      markFailed(queue, i, errorMessage);
      executionResults.push({
        subscriptionId: subscription.id,
        workflowId: subscription.workflowId,
        success: false,
        error: errorMessage
      });
    }
  }

  // Step 6: Generate summary
  const summary = getQueueSummary(queue);

  console.log(`\nEXECUTION SUMMARY:`);
  console.log(`   Total subscriptions: ${summary.total}`);
  console.log(`   Completed: ${summary.completed}`);
  console.log(`   Failed: ${summary.failed}`);
  console.log(`======== TRIGGER EXECUTION COMPLETE ========\n`);

  return {
    success: summary.failed === 0,
    message: `Executed ${summary.total} subscription(s): ${summary.completed} succeeded, ${summary.failed} failed`,
    subscriptionsFound: queue.totalCount,
    executionResults,
    summary: {
      total: summary.total,
      completed: summary.completed,
      failed: summary.failed
    }
  };
}
