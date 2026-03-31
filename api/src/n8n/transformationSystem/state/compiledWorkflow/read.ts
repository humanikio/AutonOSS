/**
 * Compiled Workflow Read Operations
 */

import { getFirestore } from 'firebase-admin/firestore';
import type { CompiledWorkflow } from '../types';

/**
 * Read all compiled nodes from Firestore
 */
export async function readCompiledWorkflow(
  tenantId: string,
  workflowId: string
): Promise<any[]> {
  const workflow = await readFullCompiledWorkflow(tenantId, workflowId);
  return workflow.nodes;
}

/**
 * Read full compiled workflow including metadata
 */
export async function readFullCompiledWorkflow(
  tenantId: string,
  workflowId: string
): Promise<CompiledWorkflow> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession')
    .collection('compiledWorkflow').doc('main');

  const doc = await ref.get();

  if (!doc.exists) {
    return {
      nodes: [],
      internalEdges: [],
      replacements: {},
      lastAppendedAt: null as any,
    };
  }

  const workflow = doc.data() as CompiledWorkflow;
  return {
    nodes: workflow.nodes || [],
    internalEdges: workflow.internalEdges || [],
    replacements: workflow.replacements || {},
    lastAppendedAt: workflow.lastAppendedAt,
  };
}
