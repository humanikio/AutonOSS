/**
 * Delete Wait Subscription
 * Remove wait subscription after execution has been resumed
 */

import { firestore } from '../../../../config/firebase';

export interface DeleteWaitSubscriptionInput {
  tenantId: string;
  workflowId: string;
  subscriptionId: string;
}

/**
 * Delete a wait subscription
 * Called after successfully resuming the execution
 */
export async function deleteWaitSubscription(
  input: DeleteWaitSubscriptionInput
): Promise<void> {
  const { tenantId, workflowId, subscriptionId } = input;

  console.log(`=�  Deleting wait subscription: ${subscriptionId}`);

  // DUAL DELETE: Remove from both global and workflow-scoped locations

  // 1. Delete global subscription
  await firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc('main')
    .collection('triggerSubscriptions').doc(subscriptionId)
    .delete();

  // 2. Delete workflow-scoped reference
  await firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('subscriptions').doc(subscriptionId)
    .delete();

  console.log(`✅ Wait subscription deleted (dual-delete): ${subscriptionId}`);
}
