/**
 * Create Wait Subscription
 * Creates a temporary subscription for a paused workflow execution waiting on an event milestone
 */

import { firestore } from '../../../../config/firebase';
import admin from 'firebase-admin';
import { ulid } from 'ulid';

export interface CreateWaitSubscriptionInput {
  tenantId: string;
  workflowId: string;        // Internal workflow ID
  n8nWorkflowId: string;     // n8n workflow ID
  executionId: string;       // n8n execution ID
  resumeUrl: string;         // Where to POST when milestone fires
  nodeId: string;            // ReactFlow node ID (for UI mapping)
  value: string;             // The wait value (e.g., '30_minutes_before', '1_hour_before')
  eventId?: string;          // Optional: Event ID this execution is waiting for (for multi-tenant filtering)
}

export interface WaitSubscription {
  id: string;
  workflowId: string;
  tenantId: string;
  triggerType: 'event.lifecycle.milestone.wait.v1';
  enabled: boolean;
  conditions: {
    payload: {
      value?: {
        $eq: string;
      };
      eventId?: {
        $eq: string;
      };
    };
  };
  // Wait-specific fields at ROOT level (no metadata wrapper)
  resumeUrl: string;
  executionId: string;
  n8nWorkflowId: string;
  nodeId: string;
  waitType: 'appointmentMilestone';
  waitEventId?: string; // Optional: stored for reference but not used in filtering
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  version: number; // Match TriggerSubscription structure
  priority?: number; // Match TriggerSubscription structure
}

/**
 * Create wait subscription for a paused workflow execution
 *
 * This subscription will be triggered when the specified milestone fires for the specified event.
 * After resume, the subscription should be deleted (one-time use).
 */
export async function createWaitSubscription(
  input: CreateWaitSubscriptionInput
): Promise<WaitSubscription> {
  const {
    tenantId,
    workflowId,
    n8nWorkflowId,
    executionId,
    resumeUrl,
    nodeId,
    value,
    eventId
  } = input;

  const now = admin.firestore.Timestamp.now();
  const subscriptionId = ulid();

  console.log('=📝 Creating wait subscription:');
  console.log(`   Subscription ID: ${subscriptionId}`);
  console.log(`   Workflow ID: ${workflowId}`);
  console.log(`   Value: ${value}`);
  console.log(`   Event ID: ${eventId || 'N/A (not required)'}`);
  console.log(`   Node ID: ${nodeId}`);

  // Build conditions using evaluateConditions format ($eq operator)
  // Wrap in payload key to match subscription structure expected by callGetSubscriptions
  // Only require value (milestone), eventId is optional for additional filtering
  const payloadConditions: WaitSubscription['conditions']['payload'] = {
    value: {
      $eq: value  // e.g., '30_minutes_before'
    }
  };

  // Add eventId condition only if provided
  if (eventId) {
    payloadConditions.eventId = {
      $eq: eventId
    };
    console.log(`   ✅ EventId condition added for additional filtering`);
  } else {
    console.log(`   ℹ️  No eventId - subscription will match all events with value=${value}`);
  }

  const conditions: WaitSubscription['conditions'] = {
    payload: payloadConditions
  };

  const subscription: WaitSubscription = {
    id: subscriptionId,
    workflowId,
    tenantId,
    triggerType: 'event.lifecycle.milestone.wait.v1',
    enabled: true,
    conditions,

    // Wait-specific fields at ROOT level (matches TriggerSubscription pattern)
    resumeUrl,
    executionId,
    n8nWorkflowId,
    nodeId,
    waitType: 'appointmentMilestone',
    waitEventId: eventId,  // Store for reference even if not used in filtering

    createdAt: now,
    updatedAt: now,
    version: 1,
    priority: 100
  };

  console.log('🔍 DEBUG: subscription object structure:');
  console.log(`   Keys: ${Object.keys(subscription).join(', ')}`);
  console.log(`   subscription.tenantId: ${subscription.tenantId}`);
  console.log(`   subscription.triggerType: ${subscription.triggerType}`);
  console.log(`   subscription.resumeUrl: ${subscription.resumeUrl}`);
  console.log(`   subscription.executionId: ${subscription.executionId}`);

  // DUAL WRITE: Store in both global and workflow-scoped locations
  // 1. Global subscription (for trigger execution system - queryable across all workflows)
  const globalSubscriptionRef = firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc('main')
    .collection('triggerSubscriptions').doc(subscriptionId);

  // Use the subscription object directly (timestamps already set to `now`)
  const globalSubscriptionData = subscription;

  console.log('🔍 DEBUG: globalSubscriptionData structure:');
  console.log(`   Keys: ${Object.keys(globalSubscriptionData).join(', ')}`);
  console.log(`   globalSubscriptionData.tenantId: ${globalSubscriptionData.tenantId}`);
  console.log(`   globalSubscriptionData.triggerType: ${globalSubscriptionData.triggerType}`);
  console.log(`   globalSubscriptionData.resumeUrl: ${globalSubscriptionData.resumeUrl}`);
  console.log(`   globalSubscriptionData.executionId: ${globalSubscriptionData.executionId}`);

  console.log('🔍 DEBUG: Full object being written to Firestore:');
  console.log(JSON.stringify(globalSubscriptionData, null, 2));

  await globalSubscriptionRef.set(globalSubscriptionData);

  // VERIFY: Read back what was actually written to Firestore
  const verifyDoc = await globalSubscriptionRef.get();
  const verifyData = verifyDoc.data();
  console.log('🔍 DEBUG: Data READ BACK from Firestore immediately after write:');
  console.log(`   tenantId: ${verifyData?.tenantId || 'MISSING'}`);
  console.log(`   triggerType: ${verifyData?.triggerType || 'MISSING'}`);
  console.log(`   resumeUrl: ${verifyData?.resumeUrl || 'MISSING'}`);
  console.log(`   executionId: ${verifyData?.executionId || 'MISSING'}`);
  console.log(`   Full document keys: ${Object.keys(verifyData || {}).join(', ')}`);

  // 2. Workflow-scoped reference (for UI display, cleanup, and workflow-specific queries)
  // USE THE SAME STRUCTURE AS GLOBAL!
  const workflowSubscriptionRef = firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('subscriptions').doc(subscriptionId);

  await workflowSubscriptionRef.set(globalSubscriptionData);

  console.log(`✅ Wait subscription created (dual-write): ${subscriptionId}`);

  return subscription;
}
