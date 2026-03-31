/**
 * Compiled Workflow Append Operations
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { CompiledWorkflow, TransformationEdge, NodeReplacement } from '../types';

/**
 * Append nodes and transformation metadata to the compiled workflow
 * Creates the document if it doesn't exist, otherwise appends to existing
 */
export async function appendCompiledWorkflow(
  tenantId: string,
  workflowId: string,
  nodes: any[],
  internalEdges: TransformationEdge[] = [],
  replacements: { [originalNodeId: string]: NodeReplacement } = {}
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession')
    .collection('compiledWorkflow').doc('main');

  const doc = await ref.get();

  if (doc.exists) {
    // Append to existing
    const existing = doc.data() as CompiledWorkflow;
    await ref.update({
      nodes: [...existing.nodes, ...nodes],
      internalEdges: [...(existing.internalEdges || []), ...internalEdges],
      replacements: { ...(existing.replacements || {}), ...replacements },
      lastAppendedAt: Timestamp.now(),
    });
    console.log(`📝 Appended ${nodes.length} nodes (total: ${existing.nodes.length + nodes.length})`);
  } else {
    // Create new
    await ref.set({
      nodes,
      internalEdges,
      replacements,
      lastAppendedAt: Timestamp.now(),
    });
    console.log(`📝 Created compiled workflow with ${nodes.length} nodes`);
  }
}
