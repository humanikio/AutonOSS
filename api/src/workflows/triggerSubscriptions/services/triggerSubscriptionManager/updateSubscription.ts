/**
 * Update an existing trigger subscription
 */

import { firestore } from '../../../../config/firebase';
import admin from 'firebase-admin';
import { UpdateSubscriptionInput, TriggerSubscription } from '../../types';
import { buildSubscriptionConditions } from './utils/buildSubscriptionConditions';

/**
 * Update a trigger subscription
 *
 * @param tenantId - Tenant identifier (REQUIRED)
 * @param subscriptionId - Subscription identifier (REQUIRED)
 * @param input - Fields to update
 * @returns Updated subscription document
 */
export async function updateSubscription(
  tenantId: string,
  subscriptionId: string,
  input: UpdateSubscriptionInput
): Promise<TriggerSubscription> {
  // Validate required parameters
  if (!tenantId) {
    throw new Error('tenantId is required');
  }

  if (!subscriptionId) {
    throw new Error('subscriptionId is required');
  }

  // Get subscription reference
  const subscriptionRef = firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc('main')
    .collection('triggerSubscriptions').doc(subscriptionId);

  // Verify subscription exists and get current data
  const doc = await subscriptionRef.get();
  if (!doc.exists) {
    throw new Error(`Subscription ${subscriptionId} not found for tenant ${tenantId}`);
  }

  const currentData = doc.data() as TriggerSubscription;
  const workflowId = currentData.workflowId;
  const triggerType = currentData.triggerType;
  const now = admin.firestore.Timestamp.now();

  // Build update object with only provided fields
  const updateData: any = {
    updatedAt: now
  };

  if (input.enabled !== undefined) {
    updateData.enabled = input.enabled;
  }

  // Handle nodeParameters -> auto-generate conditions
  if (input.nodeParameters) {
    console.log(`📋 Regenerating conditions from node parameters for ${triggerType}...`);
    const autoConditions = buildSubscriptionConditions(triggerType, input.nodeParameters);

    if (autoConditions) {
      // Merge auto-generated conditions with manually provided conditions
      updateData.conditions = {
        tags: input.conditions?.tags || currentData.conditions?.tags,
        payload: {
          ...autoConditions.payload,
          ...input.conditions?.payload
        }
      };

      console.log(`   ✅ Regenerated conditions:`, JSON.stringify(updateData.conditions.payload, null, 2));
    } else {
      console.log(`   ℹ️  No conditions generated (node parameters indicate "all")`);
      // Clear conditions if "all" filters selected
      updateData.conditions = input.conditions || undefined;
    }
  } else if (input.conditions !== undefined) {
    // Manual condition update (no nodeParameters provided)
    updateData.conditions = input.conditions;
  }

  if (input.priority !== undefined) {
    updateData.priority = input.priority;
  }

  if (input.rateLimit !== undefined) {
    updateData.rateLimit = input.rateLimit;
  }

  // ========================================================================
  // DUAL RECORD UPDATE
  // ========================================================================

  // 1. Update global subscription
  await subscriptionRef.update(updateData);
  console.log(`✅ Updated trigger subscription: ${subscriptionId}`);

  // 2. Update workflow-scoped reference (if workflowId exists)
  if (workflowId) {
    const workflowSubscriptionRef = firestore
      .collection('tenants').doc(tenantId)
      .collection('workflows').doc(workflowId)
      .collection('subscriptions').doc(subscriptionId);

    const workflowRefUpdate: any = {
      updatedAt: now
    };

    // Update nodeId if provided in nodeParameters
    if (input.nodeParameters?.nodeId) {
      workflowRefUpdate.nodeId = input.nodeParameters.nodeId;
    }

    await workflowSubscriptionRef.update(workflowRefUpdate);
    console.log(`✅ Updated workflow subscription reference: workflows/${workflowId}/subscriptions/${subscriptionId}`);
  } else {
    console.warn(`⚠️  No workflowId found for subscription ${subscriptionId} - skipped workflow reference update`);
  }

  // Fetch and return updated document
  const updatedDoc = await subscriptionRef.get();
  const updatedSubscription = updatedDoc.data() as TriggerSubscription;

  return updatedSubscription;
}
