/**
 * Review ReactFlow Service (Planning Phase)
 *
 * Analyzes ReactFlow workflow and creates a build plan (skeleton) in Firestore
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createSessionSkeleton, type ReactFlowWorkflow } from './reviewReactFlow/createSessionSkeleton';
import { exportTransformationMethods } from './reviewReactFlow/exportTransfomrationMethods';
import { writeSkeleton } from '../state/skeleton';
import { initializeSession } from '../state/session';
import { injectContactFieldAdapter } from './reviewReactFlow/injectContactFieldAdapter';
import { writeProcessedReactFlow } from '../state/processedReactFlow';
import { subWorkflowAdapter } from './reviewReactFlow/subWorkflowAdapter';
import type { ReactFlowNode } from '../transformationMethodRegistry/types/transformationMethodTypes';

/**
 * Result of planning phase
 */
export interface PlanningResult {
  success: boolean;
  totalMethods: number;
  methods: string[];
  workflowWithAdapters?: ReactFlowWorkflow;  // Adapter-enhanced workflow for orchestrator to pass to compilation
}

/**
 * Reviews ReactFlow workflow and creates session skeleton
 *
 * This is the PLANNING PHASE - it extracts the build plan from ReactFlow
 * and saves it to Firestore for the compilation phase.
 *
 * NOTE: State clearing (skeleton + compiled workflow) should be done by the
 * orchestrator BEFORE calling this function to ensure a clean slate.
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 * @param processedReactFlow - Optional pre-processed ReactFlow data (with adapters injected)
 * @returns Planning result with method count
 */
export async function reviewReactFlow(
  tenantId: string,
  workflowId: string,
  processedReactFlow?: ReactFlowWorkflow
): Promise<PlanningResult> {
  console.log(`\n=� ========== PLANNING PHASE ==========`);
  console.log(`   Tenant: ${tenantId}`);
  console.log(`   Workflow: ${workflowId}`);

  try {
    // 1. Load ReactFlow from Firestore OR use provided processed data
    let reactFlow: ReactFlowWorkflow;
    if (processedReactFlow) {
      reactFlow = processedReactFlow;
      console.log(` Using provided processed ReactFlow: ${reactFlow.name} (${reactFlow.nodes.length} nodes, ${reactFlow.edges.length} edges)`);
    } else {
      reactFlow = await loadReactFlowFromFirestore(tenantId, workflowId);
      console.log(` Loaded ReactFlow workflow from Firestore: ${reactFlow.name}`);
    }

    // 2. Inject contact field adapters
    console.log(`=� Injecting contact field adapters...`);
    const { nodes: nodesWithAdapters, edges: edgesWithAdapters, adapterMap } =
      await injectContactFieldAdapter(reactFlow.nodes, reactFlow.edges);
    console.log(`   ✅ Adapter injection complete: ${nodesWithAdapters.length} nodes (${nodesWithAdapters.length - reactFlow.nodes.length} adapters added)`);

    // 3. Apply subflow adapter (create switch-based routing for milestone waits)
    console.log(`\n=🔀 Applying subflow adapter...`);
    const subflowResult = await subWorkflowAdapter(
      nodesWithAdapters,
      edgesWithAdapters,
      tenantId,
      workflowId
    );

    if (!subflowResult.success) {
      console.error(`   ❌ Subflow adapter failed: ${subflowResult.errors.join(', ')}`);
      throw new Error(`Subflow adapter failed: ${subflowResult.errors.join(', ')}`);
    }

    const finalNodes = subflowResult.nodes;
    const finalEdges = subflowResult.edges;

    if (subflowResult.modified) {
      console.log(`   ✅ Subflow adapter applied: ${subflowResult.metadata.subflowsCreated} subflows created`);
      console.log(`      Nodes: ${nodesWithAdapters.length} → ${finalNodes.length}`);
      console.log(`      Edges: ${edgesWithAdapters.length} → ${finalEdges.length}`);
    } else {
      console.log(`   ℹ️  No subflows needed - workflow unchanged`);
    }

    // 4. Extend adapter map to include case nodes created by subflow adapter
    console.log(`\n=🔧 Extending adapter map for subflow case nodes...`);
    const extendedAdapterMap = extendAdapterMapForCaseNodes(adapterMap, finalNodes);
    console.log(`   ✅ Extended adapter map: ${adapterMap.size} → ${extendedAdapterMap.size} node mappings`);

    // 5. Create session skeleton (planning) with fully processed workflow
    const workflowWithAdapters: ReactFlowWorkflow = {
      name: reactFlow.name,
      nodes: finalNodes,
      edges: finalEdges,
    };
    const skeleton = await createSessionSkeleton(workflowWithAdapters);

    // 6. Save extended adapter map to skeleton (for field resolution during compilation)
    skeleton.adapterMap = Object.fromEntries(extendedAdapterMap);
    console.log(`   ✅ Saved adapter map: ${extendedAdapterMap.size} node mappings`);

    // 7. Save processed ReactFlow to Firestore (fully processed workflow with adapters + subflows)
    await writeProcessedReactFlow(tenantId, workflowId, {
      name: workflowWithAdapters.name,
      nodes: workflowWithAdapters.nodes,
      edges: workflowWithAdapters.edges,
      originalNodeCount: reactFlow.nodes.length,
      adapterNodeCount: nodesWithAdapters.length - reactFlow.nodes.length,
      subflowNodeCount: subflowResult.modified ? (finalNodes.length - nodesWithAdapters.length) : 0,
      createdAt: Timestamp.now(),
    });
    console.log(`   ✅ Saved processed ReactFlow to Firestore`);

    // 8. Export methods for logging/validation
    const methods = exportTransformationMethods(skeleton);
    console.log(`=� Methods to execute: ${methods.join(', ')}`);

    // 9. Save skeleton to Firestore
    await writeSkeleton(tenantId, workflowId, skeleton);
    console.log(` Saved skeleton to Firestore`);

    // 10. Initialize session metadata
    await initializeSession(tenantId, workflowId, {
      status: 'planning_complete',
      totalMethods: skeleton.methods.length,
      startedAt: Timestamp.now(),
    });
    console.log(` Initialized session metadata`);

    console.log(`\n ========== PLANNING COMPLETE ==========\n`);

    return {
      success: true,
      totalMethods: skeleton.methods.length,
      methods,
      workflowWithAdapters,  // Return adapter-enhanced workflow for orchestrator
    };
  } catch (error) {
    console.error(`L Planning phase failed:`, error);

    // Update session with error
    await initializeSession(tenantId, workflowId, {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      startedAt: Timestamp.now(),
      totalMethods: 0,
    });

    throw error;
  }
}

/**
 * Extend adapter map to include case nodes created by subflow adapter
 *
 * When subflow adapter creates case nodes (e.g., action-123-case0, action-123-case1),
 * they need to reference the same contact adapter as their original node (action-123).
 *
 * @param originalAdapterMap - Adapter map before subflow creation
 * @param finalNodes - Nodes after subflow creation (includes case nodes)
 * @returns Extended adapter map with case node mappings
 */
function extendAdapterMapForCaseNodes(
  originalAdapterMap: Map<string, string>,
  finalNodes: ReactFlowNode[]
): Map<string, string> {
  const extendedMap = new Map(originalAdapterMap);
  let addedMappings = 0;

  // Find all case nodes (nodes with IDs like "action-123-case0")
  const caseNodes = finalNodes.filter(node =>
    node.data?._originalId && node.data?._groupSuffix
  );

  console.log(`      Found ${caseNodes.length} case nodes to process`);

  for (const caseNode of caseNodes) {
    const originalId = caseNode.data._originalId;
    const caseNodeId = caseNode.id;

    // Check if original node had an adapter mapping
    const adapterNodeId = originalAdapterMap.get(originalId);

    if (adapterNodeId) {
      // Inherit the same adapter mapping
      extendedMap.set(caseNodeId, adapterNodeId);
      addedMappings++;
      console.log(`      📍 ${caseNodeId} → ${adapterNodeId} (inherited from ${originalId})`);
    }
  }

  console.log(`      Added ${addedMappings} case node mappings`);

  return extendedMap;
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
