/**
 * Create a new trigger subscription
 */

import { firestore } from '../../../../config/firebase';
import admin from 'firebase-admin';
import { ulid } from 'ulid';
import { TriggerDestinationRegistry } from '../TriggerDesitinationRegistry/index';
import { CreateSubscriptionInput, TriggerSubscription } from '../../types';
import { buildSubscriptionConditions } from './utils/buildSubscriptionConditions';

/**
 * Create a new trigger subscription for a workflow
 *
 * @param tenantId - Tenant identifier (REQUIRED)
 * @param input - Subscription creation data
 * @returns Created subscription document
 */
export async function createSubscription(
  tenantId: string,
  input: CreateSubscriptionInput
): Promise<TriggerSubscription> {
  // Validate tenantId is provided
  if (!tenantId) {
    throw new Error('tenantId is required');
  }

  // Validate required fields
  if (!input.workflowId) {
    throw new Error('workflowId is required');
  }

  if (!input.triggerType) {
    throw new Error('triggerType is required');
  }

  // Validate event type exists and is not deprecated
  const validation = TriggerDestinationRegistry.validateEventType(input.triggerType);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Verify workflow exists
  const workflowRef = firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(input.workflowId);

  const workflowDoc = await workflowRef.get();
  if (!workflowDoc.exists) {
    throw new Error(`Workflow ${input.workflowId} not found for tenant ${tenantId}`);
  }

  // Check if workflow already has a subscription (1:1 relationship)
  const existingSubscriptionQuery = await firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc('main')
    .collection('triggerSubscriptions')
    .where('workflowId', '==', input.workflowId)
    .limit(1)
    .get();

  if (!existingSubscriptionQuery.empty) {
    const existing = existingSubscriptionQuery.docs[0].data();
    throw new Error(`Workflow ${input.workflowId} already has a trigger subscription (${existing.triggerType}). One subscription per workflow is allowed.`);
  }

  // Generate subscription ID
  const subscriptionId = ulid();
  const now = admin.firestore.Timestamp.now();

  // Build conditions from node parameters if provided
  let finalConditions = input.conditions;

  if (input.nodeParameters) {
    console.log(`📋 Building conditions from node parameters for ${input.triggerType}...`);
    const autoConditions = buildSubscriptionConditions(input.triggerType, input.nodeParameters);

    if (autoConditions) {
      // Merge auto-generated conditions with manually provided conditions
      finalConditions = {
        tags: input.conditions?.tags,
        payload: {
          ...autoConditions.payload,
          ...input.conditions?.payload
        }
      };

      console.log(`   ✅ Built conditions:`, JSON.stringify(finalConditions.payload, null, 2));
    } else {
      console.log(`   ℹ️  No conditions generated (node parameters indicate "all")`);
    }
  }

  // Create subscription document
  const subscription: TriggerSubscription = {
    id: subscriptionId,
    tenantId,
    workflowId: input.workflowId,
    triggerType: input.triggerType,
    enabled: input.enabled !== undefined ? input.enabled : true,
    conditions: finalConditions || undefined,
    priority: input.priority || 100,
    rateLimit: input.rateLimit || undefined,
    version: 1,
    createdAt: now,
    updatedAt: now
  };

  // ========================================================================
  // DUAL RECORD SYSTEM
  // ========================================================================

  // 1. Global subscription (for trigger execution system)
  const subscriptionRef = firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc('main')
    .collection('triggerSubscriptions').doc(subscriptionId);

  await subscriptionRef.set(subscription);

  console.log(`✅ Created trigger subscription: ${subscriptionId} (${input.triggerType}) for workflow ${input.workflowId}`);

  // 2. Workflow-scoped reference (for easy lookup/update/delete)
  const workflowSubscriptionRef = firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(input.workflowId)
    .collection('subscriptions').doc(subscriptionId);

  const subscriptionReference = {
    subscriptionId,
    type: 'trigger' as const,
    nodeId: input.nodeParameters?.nodeId || null, // Store ReactFlow node ID if provided
    triggerType: input.triggerType,
    createdAt: now,
    updatedAt: now
  };

  await workflowSubscriptionRef.set(subscriptionReference);

  console.log(`✅ Created workflow subscription reference: workflows/${input.workflowId}/subscriptions/${subscriptionId}`);

  return subscription;
}
