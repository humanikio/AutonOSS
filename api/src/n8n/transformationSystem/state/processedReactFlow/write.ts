/**
 * ProcessedReactFlow Write Operations
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { ProcessedReactFlow } from '../types';

/**
 * Save processed (adapter-enhanced) ReactFlow to Firestore
 *
 * This is called during the planning phase after adapter injection.
 * The document is overwritten atomically on each planning run.
 */
export async function writeProcessedReactFlow(
  tenantId: string,
  workflowId: string,
  workflow: ProcessedReactFlow
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession')
    .collection('processedReactFlow').doc('main');

  await ref.set(workflow);
  console.log(`✅ Saved processed ReactFlow: ${workflow.nodes.length} nodes (${workflow.adapterNodeCount} adapters)`);
}
