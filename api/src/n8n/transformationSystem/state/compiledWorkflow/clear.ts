/**
 * Clear Compiled Workflow State
 *
 * Removes the compiled workflow document to start fresh for a new build session
 */

import { getFirestore } from 'firebase-admin/firestore';

/**
 * Clear the compiled workflow document for a workflow
 * This should be called before starting a new transformation session
 * to prevent duplicate nodes from accumulating
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 */
export async function clearCompiledWorkflow(
  tenantId: string,
  workflowId: string
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession')
    .collection('compiledWorkflow').doc('main');

  const doc = await ref.get();

  if (doc.exists) {
    await ref.delete();
    console.log(`🗑️  Cleared compiled workflow for workflow ${workflowId}`);
  } else {
    console.log(`📝 No existing compiled workflow to clear for workflow ${workflowId}`);
  }
}
