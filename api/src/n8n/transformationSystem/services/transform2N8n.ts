/**
 * Transform to N8n Service (Compilation Phase)
 *
 * Executes the build plan (skeleton) and compiles ReactFlow into n8n workflow
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { TransformationSession } from './transform2N8n/transformationSession';
import { readSkeleton } from '../state/skeleton';
import { updateSession } from '../state/session';
import { readProcessedReactFlow } from '../state/processedReactFlow';
import type { ReactFlowWorkflow } from '../transformationMethodRegistry/types/transformationMethodTypes';

/**
 * Result of compilation phase
 */
export interface CompilationResult {
  success: boolean;
  totalNodes: number;
  connections: any; // n8n connections map
}

/**
 * Transforms ReactFlow to n8n workflow
 *
 * This is the COMPILATION PHASE - it executes the build plan (skeleton)
 * and produces the final n8n workflow.
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 * @param apiKey - Optional API key for custom nodes
 * @param processedReactFlow - Optional pre-processed ReactFlow data (with adapters injected)
 * @returns Compilation result with node count
 */
export async function transform2N8n(
  tenantId: string,
  workflowId: string,
  apiKey?: string,
  processedReactFlow?: ReactFlowWorkflow
): Promise<CompilationResult> {
  console.log(`\n=' ========== COMPILATION PHASE ==========`);
  console.log(`   Tenant: ${tenantId}`);
  console.log(`   Workflow: ${workflowId}`);

  try {
    // Update session status
    await updateSession(tenantId, workflowId, {
      status: 'compiling',
    });

    // 1. Load skeleton from Firestore
    const skeleton = await readSkeleton(tenantId, workflowId);
    console.log(` Loaded skeleton with ${skeleton.methods.length} methods`);

    // 2. Load ReactFlow (adapter-enhanced version for compilation)
    let reactFlow: ReactFlowWorkflow;
    if (processedReactFlow) {
      // Happy path: Use in-memory workflow passed from orchestrator
      reactFlow = processedReactFlow;
      console.log(` Using provided processed ReactFlow: ${reactFlow.name} (${reactFlow.nodes.length} nodes)`);
    } else {
      // Recovery path: Load adapter-enhanced workflow from Firestore
      console.log(` No processed ReactFlow provided, loading from Firestore...`);
      try {
        const processed = await readProcessedReactFlow(tenantId, workflowId);
        reactFlow = {
          name: processed.name,
          nodes: processed.nodes,
          edges: processed.edges,
        };
        console.log(` ✅ Loaded processed ReactFlow from Firestore: ${reactFlow.name} (${reactFlow.nodes.length} nodes, ${processed.adapterNodeCount} adapters)`);
      } catch (error) {
        console.error(` ❌ Failed to load processed ReactFlow from Firestore:`, error);
        throw new Error(
          `Cannot proceed with compilation: Processed ReactFlow not found. ` +
          `Planning phase must complete successfully before compilation can run.`
        );
      }
    }

    // 3. Initialize and execute session
    const session = new TransformationSession(
      tenantId,
      workflowId,
      skeleton,
      reactFlow,
      apiKey
    );

    const result = await session.execute();
    console.log(` Session execution complete`);

    // 4. Update session metadata (final record keeping)
    await updateSession(tenantId, workflowId, {
      status: 'complete',
      completedAt: Timestamp.now(),
      totalNodesCreated: result.nodes.length,
    });

    console.log(`\n ========== COMPILATION COMPLETE ==========\n`);

    return {
      success: true,
      totalNodes: result.nodes.length,
      connections: result.connections, // Return connections built during compilation
    };
  } catch (error) {
    console.error(`L Compilation phase failed:`, error);

    // Update session with error
    await updateSession(tenantId, workflowId, {
      status: 'failed',
      completedAt: Timestamp.now(),
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Load ReactFlow workflow from Firestore
 */
async function loadReactFlowFromFirestore(
  tenantId: string,
  workflowId: string
): Promise<ReactFlowWorkflow> {
  const db = getFirestore();
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId);

  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error(`Workflow ${workflowId} not found`);
  }

  const data = doc.data();

  if (!data?.nodes || !data?.edges) {
    throw new Error(`Workflow ${workflowId} is missing nodes or edges`);
  }

  return {
    name: data.name || 'Untitled Workflow',
    nodes: data.nodes,
    edges: data.edges,
  };
}
