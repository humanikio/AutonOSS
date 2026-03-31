/**
 * ProcessedReactFlow Read Operations
 */

import { getFirestore } from 'firebase-admin/firestore';
import type { ProcessedReactFlow } from '../types';

/**
 * Load processed (adapter-enhanced) ReactFlow from Firestore
 *
 * This is called during compilation phase recovery when the in-memory
 * workflow is not available (e.g., retries after failures).
 */
export async function readProcessedReactFlow(
  tenantId: string,
  workflowId: string
): Promise<ProcessedReactFlow> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession')
    .collection('processedReactFlow').doc('main');

  const doc = await ref.get();

  if (!doc.exists) {
    throw new Error(
      `Processed ReactFlow not found for workflow ${workflowId}. ` +
      `Planning phase may not have completed.`
    );
  }

  return doc.data() as ProcessedReactFlow;
}
