/**
 * Write to Processed ReactFlow
 *
 * Persists the modified ReactFlow (with subflows) to Firestore.
 * This updates the processedReactFlow document that will be used for n8n compilation.
 */

import { db } from '../../../../../../config/firestore';
import type { ReactFlowNode, ReactFlowEdge } from '../../../../transformationMethodRegistry/types/transformationMethodTypes';

/**
 * Write result
 */
export interface WriteResult {
  success: boolean;
  documentId: string;
  nodeCount: number;
  edgeCount: number;
  timestamp: Date;
  error?: string;
}

/**
 * Write modified ReactFlow to Firestore
 *
 * Updates the processedReactFlow document with nodes and edges after subflow creation.
 *
 * @param workspaceId - Workspace ID
 * @param workflowId - Workflow ID
 * @param nodes - Modified nodes array (including subflow groups)
 * @param edges - Modified edges array (including switch routing)
 * @param metadata - Optional metadata about the transformation
 * @returns Write result
 */
export async function write2ProcessedReactflow(
  workspaceId: string,
  workflowId: string,
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  metadata?: {
    subflowsCreated: number;
    pathsProcessed: number;
    originalNodeCount: number;
    originalEdgeCount: number;
  }
): Promise<WriteResult> {
  const timestamp = new Date();

  console.log(`\n   =� Writing to processedReactFlow...`);
  console.log(`      Workspace: ${workspaceId}`);
  console.log(`      Workflow: ${workflowId}`);
  console.log(`      Nodes: ${nodes.length}`);
  console.log(`      Edges: ${edges.length}`);

  try {
    const docRef = db
      .collection('workspaces')
      .doc(workspaceId)
      .collection('workflows')
      .doc(workflowId)
      .collection('processedReactFlow')
      .doc('latest');

    await docRef.set(
      {
        nodes,
        edges,
        metadata: {
          ...metadata,
          lastModified: timestamp,
          modifiedBy: 'subWorkflowAdapter',
        },
        version: 2, // Version 2 indicates subflow processing
      },
      { merge: false } // Full replacement
    );

    console.log(`    Successfully wrote to processedReactFlow`);

    if (metadata) {
      console.log(`      Subflows created: ${metadata.subflowsCreated}`);
      console.log(`      Paths processed: ${metadata.pathsProcessed}`);
      console.log(
        `      Node delta: ${nodes.length - metadata.originalNodeCount} (${metadata.originalNodeCount} � ${nodes.length})`
      );
      console.log(
        `      Edge delta: ${edges.length - metadata.originalEdgeCount} (${metadata.originalEdgeCount} � ${edges.length})`
      );
    }

    return {
      success: true,
      documentId: docRef.id,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      timestamp,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   L Failed to write to processedReactFlow: ${errorMessage}`);

    return {
      success: false,
      documentId: 'latest',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      timestamp,
      error: errorMessage,
    };
  }
}

/**
 * Read current processedReactFlow from Firestore
 *
 * @param workspaceId - Workspace ID
 * @param workflowId - Workflow ID
 * @returns Current nodes and edges, or null if not found
 */
export async function readProcessedReactflow(
  workspaceId: string,
  workflowId: string
): Promise<{
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  metadata?: any;
} | null> {
  console.log(`   =� Reading processedReactFlow...`);

  try {
    const docRef = db
      .collection('workspaces')
      .doc(workspaceId)
      .collection('workflows')
      .doc(workflowId)
      .collection('processedReactFlow')
      .doc('latest');

    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`   9  No processedReactFlow found`);
      return null;
    }

    const data = doc.data();

    if (!data) {
      console.log(`   �  processedReactFlow document exists but has no data`);
      return null;
    }

    console.log(
      `    Read processedReactFlow: ${data.nodes?.length || 0} nodes, ${data.edges?.length || 0} edges`
    );

    return {
      nodes: data.nodes || [],
      edges: data.edges || [],
      metadata: data.metadata,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   L Failed to read processedReactFlow: ${errorMessage}`);
    return null;
  }
}

/**
 * Create backup of current processedReactFlow before modification
 *
 * @param workspaceId - Workspace ID
 * @param workflowId - Workflow ID
 * @returns Backup success status
 */
export async function backupProcessedReactflow(
  workspaceId: string,
  workflowId: string
): Promise<boolean> {
  console.log(`   =� Creating backup of processedReactFlow...`);

  try {
    const current = await readProcessedReactflow(workspaceId, workflowId);

    if (!current) {
      console.log(`   9  No current processedReactFlow to backup`);
      return true; // Not an error
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDocRef = db
      .collection('workspaces')
      .doc(workspaceId)
      .collection('workflows')
      .doc(workflowId)
      .collection('processedReactFlow')
      .doc(`backup-${timestamp}`);

    await backupDocRef.set({
      ...current,
      backupTimestamp: new Date(),
    });

    console.log(`    Backup created: backup-${timestamp}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   L Failed to create backup: ${errorMessage}`);
    return false;
  }
}

/**
 * Validate write parameters before persisting
 *
 * @param nodes - Nodes to write
 * @param edges - Edges to write
 * @returns Validation result
 */
export function validateWriteParams(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(nodes)) {
    errors.push('Nodes must be an array');
  } else if (nodes.length === 0) {
    errors.push('Nodes array is empty');
  }

  if (!Array.isArray(edges)) {
    errors.push('Edges must be an array');
  }

  // Check for node ID uniqueness
  const nodeIds = new Set<string>();
  nodes.forEach(node => {
    if (!node.id) {
      errors.push('Node missing ID');
      return;
    }
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  });

  // Check edge references
  edges.forEach(edge => {
    if (!edge.id) {
      errors.push('Edge missing ID');
      return;
    }
    if (!edge.source) {
      errors.push(`Edge ${edge.id} missing source`);
    }
    if (!edge.target) {
      errors.push(`Edge ${edge.id} missing target`);
    }
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references non-existent source: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references non-existent target: ${edge.target}`);
    }
  });

  if (errors.length > 0) {
    console.error(`   L Write validation failed with ${errors.length} errors`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
