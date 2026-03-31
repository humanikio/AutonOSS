/**
 * Resolve Workflow Subscription
 *
 * Finds a subscription for a workflow using the workflow-scoped reference collection.
 * This avoids having to query the global subscription collection with a where clause.
 */

import { firestore } from '../../../../../config/firebase';

export interface ResolveWorkflowSubscriptionInput {
  tenantId: string;
  workflowId: string;
  type?: 'trigger' | 'wait';  // Optional: filter by subscription type
  nodeId?: string;            // Optional: filter by specific node ID
}

export interface WorkflowSubscriptionReference {
  subscriptionId: string;
  type: 'trigger' | 'wait';
  nodeId: string | null;
  triggerType: string;
  createdAt: any;
  updatedAt: any;
}

/**
 * Find subscription(s) for a workflow
 *
 * @param input - Workflow and filter criteria
 * @returns Array of subscription references
 *
 * @example
 * // Find trigger subscription for a workflow
 * const refs = await resolveWorkflowSubscription({
 *   tenantId: 'tenant-abc',
 *   workflowId: 'workflow-xyz',
 *   type: 'trigger'
 * });
 *
 * @example
 * // Find specific node's subscription
 * const refs = await resolveWorkflowSubscription({
 *   tenantId: 'tenant-abc',
 *   workflowId: 'workflow-xyz',
 *   nodeId: 'trigger-123'
 * });
 */
export async function resolveWorkflowSubscription(
  input: ResolveWorkflowSubscriptionInput
): Promise<WorkflowSubscriptionReference[]> {
  const { tenantId, workflowId, type, nodeId } = input;

  // Validate inputs
  if (!tenantId) {
    throw new Error('tenantId is required');
  }

  if (!workflowId) {
    throw new Error('workflowId is required');
  }

  console.log(`= Resolving subscriptions for workflow: ${workflowId}`);
  if (type) console.log(`   Type filter: ${type}`);
  if (nodeId) console.log(`   Node ID filter: ${nodeId}`);

  // Query workflow subscriptions subcollection
  let query = firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('subscriptions') as any;

  // Apply type filter if provided
  if (type) {
    query = query.where('type', '==', type);
  }

  // Apply nodeId filter if provided
  if (nodeId) {
    query = query.where('nodeId', '==', nodeId);
  }

  const snapshot = await query.get();

  const subscriptions: WorkflowSubscriptionReference[] = snapshot.docs.map((doc: any) => ({
    subscriptionId: doc.id,
    ...doc.data()
  }));

  console.log(` Found ${subscriptions.length} subscription(s)`);

  return subscriptions;
}

/**
 * Find trigger subscription for a workflow (convenience method)
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 * @returns Subscription reference or null if not found
 */
export async function findTriggerSubscription(
  tenantId: string,
  workflowId: string
): Promise<WorkflowSubscriptionReference | null> {
  const results = await resolveWorkflowSubscription({
    tenantId,
    workflowId,
    type: 'trigger'
  });

  return results.length > 0 ? results[0] : null;
}

/**
 * Find wait subscriptions for a workflow
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 * @returns Array of wait subscription references
 */
export async function findWaitSubscriptions(
  tenantId: string,
  workflowId: string
): Promise<WorkflowSubscriptionReference[]> {
  return resolveWorkflowSubscription({
    tenantId,
    workflowId,
    type: 'wait'
  });
}
