/**
 * Delete a trigger subscription
 */

import { firestore } from '../../../../config/firebase';

/**
 * Delete a trigger subscription
 *
 * @param tenantId - Tenant identifier (REQUIRED)
 * @param subscriptionId - Subscription identifier (REQUIRED)
 */
export async function deleteSubscription(
  tenantId: string,
  subscriptionId: string
): Promise<void> {
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

  // Verify subscription exists and get workflowId
  const doc = await subscriptionRef.get();
  if (!doc.exists) {
    throw new Error(`Subscription ${subscriptionId} not found for tenant ${tenantId}`);
  }

  const subscriptionData = doc.data();
  const workflowId = subscriptionData?.workflowId;

  // ========================================================================
  // DUAL RECORD DELETION
  // ========================================================================

  // 1. Delete global subscription
  await subscriptionRef.delete();
  console.log(`✅ Deleted trigger subscription: ${subscriptionId}`);

  // 2. Delete workflow-scoped reference (if workflowId exists)
  if (workflowId) {
    const workflowSubscriptionRef = firestore
      .collection('tenants').doc(tenantId)
      .collection('workflows').doc(workflowId)
      .collection('subscriptions').doc(subscriptionId);

    await workflowSubscriptionRef.delete();
    console.log(`✅ Deleted workflow subscription reference: workflows/${workflowId}/subscriptions/${subscriptionId}`);
  } else {
    console.warn(`⚠️  No workflowId found for subscription ${subscriptionId} - skipped workflow reference deletion`);
  }
}
