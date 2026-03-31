/**
 * Custom Field Resolver - Main Orchestrator
 *
 * ⚠️ LEGACY FILE - NO LONGER USED ⚠️
 * This file has been replaced by integrated planning/compilation approach.
 *
 * New approach:
 * - Adapter injection: /services/reviewReactFlow/injectContactFieldAdapter.ts (planning phase)
 * - Field resolution: /services/transform2N8n/resolveContactFields.ts (compilation phase)
 *
 * Kept for reference and potential rollback only.
 *
 * ===== OLD DOCUMENTATION BELOW =====
 *
 * Coordinates the entire custom field resolution process:
 * 1. Inject contact adapter nodes
 * 2. Resolve contact field placeholders
 */

import { injectContactFieldAdapter, ReactFlowNode, ReactFlowEdge } from './injectContactFieldAdapter';
import { resolveContactCustomFields } from './contactCustomFields';

export interface WorkflowData {
  name: string;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  status?: string;
  [key: string]: any;
}

/**
 * Main resolver function
 */
export async function resolveCustomFields(workflowData: WorkflowData): Promise<WorkflowData> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 CUSTOM FIELD RESOLVER - START');
  console.log('   Workflow: ' + workflowData.name);
  console.log('   Nodes: ' + workflowData.nodes.length);
  console.log('   Edges: ' + workflowData.edges.length);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    console.log('📦 STEP 1: Injecting contact adapters...');
    const { nodes: nodesWithAdapters, edges: edgesWithAdapters, adapterMap } =
      await injectContactFieldAdapter(workflowData.nodes, workflowData.edges);

    console.log('');

    console.log('🔍 STEP 2: Resolving contact field placeholders...');
    const resolvedNodes = await resolveContactCustomFields(nodesWithAdapters, adapterMap);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CUSTOM FIELD RESOLVER - COMPLETE');
    console.log('   Original: ' + workflowData.nodes.length + ' nodes, ' + workflowData.edges.length + ' edges');
    console.log('   Final: ' + resolvedNodes.length + ' nodes (+' + (resolvedNodes.length - workflowData.nodes.length) + ' adapters), ' + edgesWithAdapters.length + ' edges');
    console.log('   Adapter mappings: ' + adapterMap.size + ' nodes');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      ...workflowData,
      nodes: resolvedNodes,
      edges: edgesWithAdapters,
    };
  } catch (error) {
    console.error('❌ CUSTOM FIELD RESOLVER - ERROR:', error);
    throw new Error('Custom field resolution failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}
