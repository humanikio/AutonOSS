/**
 * Clear ProcessedReactFlow State
 *
 * Removes the processedReactFlow document to start fresh for a new build session
 */

import { getFirestore } from 'firebase-admin/firestore';

/**
 * Clear the processedReactFlow document for a workflow
 * This should be called before planning phase to prevent stale data
 * from previous builds
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 */
export async function clearProcessedReactFlow(
  tenantId: string,
  workflowId: string
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession')
    .collection('processedReactFlow').doc('main');

  const doc = await ref.get();

  if (doc.exists) {
    await ref.delete();
    console.log(`🗑️  Cleared processed ReactFlow for workflow ${workflowId}`);
  } else {
    console.log(`📝 No existing processed ReactFlow to clear for workflow ${workflowId}`);
  }
}
