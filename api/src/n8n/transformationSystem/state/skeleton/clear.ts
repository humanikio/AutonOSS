/**
 * Clear Skeleton State
 *
 * Removes the skeleton document to start fresh for a new build session
 */

import { getFirestore } from 'firebase-admin/firestore';

/**
 * Clear the skeleton document for a workflow
 * This should be called before creating a new skeleton
 * to prevent stale data from previous builds
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 */
export async function clearSkeleton(
  tenantId: string,
  workflowId: string
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession')
    .collection('skeleton').doc('main');

  const doc = await ref.get();

  if (doc.exists) {
    await ref.delete();
    console.log(`🗑️  Cleared skeleton for workflow ${workflowId}`);
  } else {
    console.log(`📝 No existing skeleton to clear for workflow ${workflowId}`);
  }
}
