/**
 * Read Workflow Wait Subscription
 * Get a single wait subscription by ID
 */

import { getFirestore } from 'firebase-admin/firestore';
import { WaitSubscription } from './createWaitSubscription';

export interface ReadWaitSubscriptionInput {
  tenantId: string;
  workflowId: string;
  subscriptionId: string;
}

/**
 * Read a single wait subscription by ID
 */
export async function readWorkflowWaitSubscription(
  input: ReadWaitSubscriptionInput
): Promise<WaitSubscription | null> {
  const { tenantId, workflowId, subscriptionId } = input;

  const db = getFirestore();

  const doc = await db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('triggerSubscriptions').doc(subscriptionId)
    .get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;

  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date()
  } as WaitSubscription;
}
