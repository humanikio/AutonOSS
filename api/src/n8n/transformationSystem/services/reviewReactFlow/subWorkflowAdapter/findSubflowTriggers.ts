/**
 * Subflow Trigger Detection
 *
 * Analyzes workflow graph to identify nodes with subflow trigger configuration
 * and detect linear paths that meet subflow creation criteria.
 */

import { NodeRegistry } from '../../../../../workflows/services/nodeRegistry';
import { topologicalSort } from '../../../utils/topologicalSort';
import type { ReactFlowNode, ReactFlowEdge } from '../../../transformationMethodRegistry/types/transformationMethodTypes';
import type { SubflowPath } from './memory/cacheLinearPath';

/**
 * Find all subflow triggers in the workflow
 *
 * @param nodes - ReactFlow nodes
 * @param edges - ReactFlow edges
 * @returns Array of subflow paths that meet criteria
 */
export function findSubflowTriggers(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): SubflowPath[] {
  console.log(`= Searching for subflow triggers...`);
  console.log(`   Nodes: ${nodes.length}, Edges: ${edges.length}`);

  // 1. Get topologically sorted nodes
  const orderedNodes = topologicalSort(nodes, edges);
  console.log(`    Topological sort complete`);

  // 2. Identify all nodes with subflow trigger config
  const triggerNodes = identifyTriggerNodes(orderedNodes);

  if (triggerNodes.length === 0) {
    console.log(`   9  No subflow trigger nodes found`);
    return [];
  }

  console.log(`   =� Found ${triggerNodes.length} potential trigger nodes`);

  // 3. Group triggers by type
  const triggersByType = groupTriggersByType(triggerNodes);

  // 4. For each trigger type, find linear paths
  const paths: SubflowPath[] = [];
  let pathCounter = 1;

  for (const [triggerType, triggers] of Object.entries(triggersByType)) {
    console.log(`\n   = Analyzing trigger type: ${triggerType} (${triggers.length} nodes)`);

    // Find linear paths containing these triggers
    const linearPaths = findLinearPaths(orderedNodes, edges, triggers, triggerType);

    // Filter paths that meet minCount criteria
    const validPaths = linearPaths.filter(path => {
      const config = NodeRegistry.getNodeConfig(path.triggers[0].data?.nodeName || path.triggers[0].type);
      const minCount = config?._pulseline?.subflowTrigger?.minCount || 2;
      return path.triggers.length >= minCount;
    });

    if (validPaths.length > 0) {
      console.log(`    Found ${validPaths.length} valid path(s) for ${triggerType}`);

      // Assign path IDs and add to paths array
      validPaths.forEach(path => {
        const pathWithId: SubflowPath = {
          ...path,
          pathId: `path${pathCounter++}`
        };
        paths.push(pathWithId);
      });
    } else {
      console.log(`   � No valid paths for ${triggerType} (need minCount triggers in linear path)`);
    }
  }

  console.log(`\n   =� Total subflow paths found: ${paths.length}`);
  return paths;
}

/**
 * Identify nodes with subflow trigger configuration
 */
function identifyTriggerNodes(nodes: ReactFlowNode[]): Array<{ node: ReactFlowNode; triggerType: string; triggerWhen: string | undefined }> {
  const triggers: Array<{ node: ReactFlowNode; triggerType: string; triggerWhen: string | undefined }> = [];

  for (const node of nodes) {
    const nodeName = node.data?.nodeName || node.type;
    const config = NodeRegistry.getNodeConfig(nodeName);

    if (!config?._pulseline?.subflowTrigger) {
      continue; // No subflow trigger config
    }

    const triggerConfig = config._pulseline.subflowTrigger;
    const triggerType = triggerConfig.type;
    const triggerWhen = triggerConfig.triggerWhen;

    // Check if triggerWhen parameter matches (if specified)
    if (triggerWhen) {
      const selectorParam = config._pulseline.transformationMethodSelector;
      const paramValue = node.data?.parameters?.[selectorParam!] || node.data?.[selectorParam!];

      if (paramValue !== triggerWhen) {
        continue; // Parameter doesn't match triggerWhen condition
      }
    }

    triggers.push({ node, triggerType, triggerWhen });
  }

  return triggers;
}

/**
 * Group trigger nodes by type
 */
function groupTriggersByType(
  triggers: Array<{ node: ReactFlowNode; triggerType: string; triggerWhen: string | undefined }>
): Record<string, ReactFlowNode[]> {
  const groups: Record<string, ReactFlowNode[]> = {};

  for (const { node, triggerType } of triggers) {
    if (!groups[triggerType]) {
      groups[triggerType] = [];
    }
    groups[triggerType].push(node);
  }

  return groups;
}

/**
 * Find linear paths containing trigger nodes
 *
 * A linear path is a sequence of nodes with no branching (each node has exactly 1 outgoing edge)
 * until we hit a branch point or end of workflow.
 */
function findLinearPaths(
  orderedNodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  triggerNodes: ReactFlowNode[],
  triggerType: string
): Omit<SubflowPath, 'pathId'>[] {
  const paths: Omit<SubflowPath, 'pathId'>[] = [];

  // Build adjacency map for quick lookup
  const outgoingEdges = new Map<string, ReactFlowEdge[]>();
  edges.forEach(edge => {
    if (!outgoingEdges.has(edge.source)) {
      outgoingEdges.set(edge.source, []);
    }
    outgoingEdges.get(edge.source)!.push(edge);
  });

  // Find linear segments containing triggers
  let currentSegment: ReactFlowNode[] = [];
  let segmentStartIndex = 0;

  for (let i = 0; i < orderedNodes.length; i++) {
    const node = orderedNodes[i];
    const outgoing = outgoingEdges.get(node.id) || [];

    // Add node to current segment
    if (currentSegment.length === 0) {
      segmentStartIndex = i;
    }
    currentSegment.push(node);

    // Check if this is end of linear path (branching or terminal node)
    const isBranching = outgoing.length > 1;
    const isTerminal = outgoing.length === 0;
    const isEndOfPath = isBranching || isTerminal || i === orderedNodes.length - 1;

    if (isEndOfPath) {
      // Check if this segment contains trigger nodes
      const triggersInSegment = currentSegment.filter(n =>
        triggerNodes.some(t => t.id === n.id)
      );

      if (triggersInSegment.length > 0) {
        paths.push({
          triggerType,
          nodes: [...currentSegment],
          triggers: triggersInSegment,
          startIndex: segmentStartIndex,
          endIndex: i
        });
      }

      // Start new segment
      currentSegment = [];
    }
  }

  return paths;
}
