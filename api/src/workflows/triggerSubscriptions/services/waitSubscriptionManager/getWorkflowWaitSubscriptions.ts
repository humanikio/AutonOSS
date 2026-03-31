/**
 * Get Workflow Wait Subscriptions
 * Query wait subscriptions for a workflow by value (milestone type)
 */

import { getFirestore } from 'firebase-admin/firestore';
import { WaitSubscription } from './createWaitSubscription';

export interface GetWorkflowWaitSubscriptionsInput {
  tenantId: string;
  workflowId: string;
  value?: string;      // Optional: Filter by specific wait value (e.g., '30_minutes_before')
  eventId?: string;    // Optional: Filter by specific event ID
}

/**
 * Get all wait subscriptions for a workflow
 * Can filter by value and/or eventId
 */
export async function getWorkflowWaitSubscriptions(
  input: GetWorkflowWaitSubscriptionsInput
): Promise<WaitSubscription[]> {
  const { tenantId, workflowId, value, eventId } = input;

  const db = getFirestore();

  console.log('Querying wait subscriptions:');
  console.log(`   Workflow ID: ${workflowId}`);
  if (value) console.log(`   Value: ${value}`);
  if (eventId) console.log(`   Event ID: ${eventId}`);

  let query = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('triggerSubscriptions')
    .where('triggerType', '==', 'event.lifecycle.milestone.wait.v1')
    .where('enabled', '==', true) as any;

  // Apply optional filters
  if (value) {
    query = query.where('conditions.value.value', '==', value);
  }

  if (eventId) {
    query = query.where('conditions.eventId.value', '==', eventId);
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    console.log('   No wait subscriptions found');
    return [];
  }

  const subscriptions = snapshot.docs.map((doc: any) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as WaitSubscription;
  });

  console.log(`   Found ${subscriptions.length} wait subscription(s)`);

  return subscriptions;
}
