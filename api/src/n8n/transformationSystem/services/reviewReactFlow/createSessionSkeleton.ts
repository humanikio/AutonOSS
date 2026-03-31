/**
 * Create Session Skeleton
 *
 * Analyzes ReactFlow workflow and creates an ordered build plan
 */

import { Timestamp } from 'firebase-admin/firestore';
import { NodeRegistry } from '../../../../workflows/services/nodeRegistry';
import { topologicalSort } from '../../utils/topologicalSort';
import type { ReactFlowNode, ReactFlowEdge } from '../../transformationMethodRegistry/types/transformationMethodTypes';
import type { SessionSkeleton, SkeletonTask } from '../../state/types';

/**
 * ReactFlow workflow structure
 */
export interface ReactFlowWorkflow {
  name: string;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

/**
 * Creates a session skeleton from ReactFlow workflow
 *
 * @param reactFlow - ReactFlow workflow data
 * @returns Session skeleton with ordered tasks
 */
export async function createSessionSkeleton(
  reactFlow: ReactFlowWorkflow
): Promise<SessionSkeleton> {
  console.log(`=� Creating session skeleton for workflow: ${reactFlow.name}`);
  console.log(`   - Nodes: ${reactFlow.nodes.length}`);
  console.log(`   - Edges: ${reactFlow.edges.length}`);

  // 1. Topological sort to determine execution order
  const orderedNodes = topologicalSort(reactFlow.nodes, reactFlow.edges);
  console.log(` Topological sort complete - determined execution order`);

  // 2. Map each node to its transformation method
  const methods: SkeletonTask[] = [];

  for (let i = 0; i < orderedNodes.length; i++) {
    const node = orderedNodes[i];

    // Extract node name from data.nodeName or type field
    // Type field might be like "smsReceivedTrigger" or just the node name
    const nodeName = node.data?.nodeName || node.type;

    // Look up the node configuration
    const config = NodeRegistry.getNodeConfig(nodeName);

    if (!config) {
      console.warn(`   ⚠️  [${i + 1}] ${node.id} (${nodeName}) - Config not found in NodeRegistry`);
      console.warn(`       Available nodes: ${NodeRegistry.getNodeNames().join(', ')}`);
    }

    // Get declared transformation method (if any)
    let methodName = config?._pulseline?.transformationMethod;

    // Check for dynamic transformation method (based on node parameter)
    if (!methodName && config?._pulseline?.transformationMethodMap && config?._pulseline?.transformationMethodSelector) {
      const selectorParam = config._pulseline.transformationMethodSelector;
      const methodMap = config._pulseline.transformationMethodMap as Record<string, string>;

      // Get the value from node's parameters/data
      const paramValue = node.data?.parameters?.[selectorParam] || node.data?.[selectorParam];

      if (paramValue && methodMap[paramValue]) {
        methodName = methodMap[paramValue];
        console.log(`   🔀 [${i + 1}] ${node.id} (${nodeName}) - Dynamic method: ${selectorParam}=${paramValue} → ${methodName}`);
      } else {
        console.warn(`   ⚠️  [${i + 1}] ${node.id} (${nodeName}) - Selector '${selectorParam}' not found in node data or no mapping for value '${paramValue}'`);
        console.warn(`       Available mappings: ${Object.keys(methodMap).join(', ')}`);
        console.warn(`       Node data keys: ${Object.keys(node.data || {}).join(', ')}`);
        if (node.data?.parameters) {
          console.warn(`       Node parameters: ${Object.keys(node.data.parameters).join(', ')}`);
        }
      }
    }

    if (methodName) {
      // Custom transformation declared
      methods.push({
        position: i + 1,
        methodName,
        sourceNodeId: node.id,
        sourceNodeType: node.type,
        status: 'pending',
      });
      console.log(`   =' [${i + 1}] ${node.id} (${nodeName}) → ${methodName}`);
    } else {
      // Standard node conversion (no transformation)
      methods.push({
        position: i + 1,
        methodName: 'standard',
        sourceNodeId: node.id,
        sourceNodeType: node.type,
        status: 'pending',
      });
      console.log(`   =� [${i + 1}] ${node.id} (${nodeName}) � standard (no config or no transformationMethod)`);
    }
  }

  console.log(` Created skeleton with ${methods.length} methods`);

  return {
    methods,
    edges: reactFlow.edges, // Store edges for connection wiring
    createdAt: Timestamp.now(),
  };
}
