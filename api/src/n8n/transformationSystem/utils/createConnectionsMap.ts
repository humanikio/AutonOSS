/**
 * Connection Wiring Utility
 *
 * Creates n8n connections object from ReactFlow edges and compiled n8n nodes.
 * This maps ReactFlow node IDs → n8n node names for proper connection wiring.
 */

import type {
  ReactFlowEdge,
  ReplacementMap
} from '../transformationMethodRegistry/types/transformationMethodTypes';

/**
 * n8n connection structure
 */
export interface N8nConnection {
  node: string; // Target node name
  type: 'main';
  index: number; // Target input index (usually 0)
}

export interface N8nConnectionsMap {
  [sourceNodeName: string]: {
    main: N8nConnection[][]; // Array of outputs, each containing array of connections
  };
}

/**
 * Internal edge for injected node chains
 */
interface InternalEdge {
  from: string;
  to: string;
}

/**
 * Creates n8n connections map from ReactFlow edges and compiled nodes
 *
 * @param edges - ReactFlow edges
 * @param compiledNodes - Compiled n8n nodes (with id and name fields)
 * @param internalEdges - Internal edges between injected nodes
 * @param replacements - Node ID replacements for edge rewiring
 * @returns n8n connections object
 */
export function createConnectionsMap(
  edges: ReactFlowEdge[],
  compiledNodes: any[],
  internalEdges: InternalEdge[] = [],
  replacements: ReplacementMap = {}
): N8nConnectionsMap {
  const connections: N8nConnectionsMap = {};

  // Create mapping: ReactFlow node ID → n8n node name
  const nodeIdToName = new Map<string, string>();
  compiledNodes.forEach((node) => {
    // n8n nodes use 'id' for ReactFlow ID and 'name' for display name
    // For connections, we use the node name
    nodeIdToName.set(node.id, node.name);
  });

  // STEP 1: Add internal edges (connections INSIDE injected node chains)
  internalEdges.forEach((internalEdge) => {
    const sourceName = nodeIdToName.get(internalEdge.from);
    const targetName = nodeIdToName.get(internalEdge.to);

    if (!sourceName || !targetName) {
      console.warn(`⚠️  Internal edge ${internalEdge.from} → ${internalEdge.to} has missing nodes`);
      return;
    }

    if (!connections[sourceName]) {
      connections[sourceName] = { main: [[]] };
    }

    connections[sourceName].main[0].push({
      node: targetName,
      type: 'main',
      index: 0,
    });
  });

  // STEP 2: Process ReactFlow edges with replacement mapping
  // Group edges by source node and output handle
  const edgesBySource = new Map<string, Map<number, ReactFlowEdge[]>>();

  edges.forEach((edge) => {
    // Apply replacements to source/target node IDs
    let sourceNodeId = edge.source;
    let targetNodeId = edge.target;

    // If source was replaced (e.g., wait → Set+HTTP+Wait), use outgoingSource
    if (replacements[sourceNodeId]) {
      sourceNodeId = replacements[sourceNodeId].outgoingSource;
    }

    // If target was replaced, use incomingTarget
    if (replacements[targetNodeId]) {
      targetNodeId = replacements[targetNodeId].incomingTarget;
    }

    // Now use the mapped IDs for grouping
    const finalEdge = { ...edge, source: sourceNodeId, target: targetNodeId };

    // Extract output index from sourceHandle
    // Handle multiple formats:
    // - "output_0", "output_1" -> 0, 1 (standard multi-output nodes)
    // - "true", "false" -> 0, 1 (IF nodes from ReactFlow)
    // - undefined -> 0 (single-output nodes)
    let outputIndex = 0;
    if (finalEdge.sourceHandle) {
      if (finalEdge.sourceHandle === 'true' || finalEdge.sourceHandle === 'output_0') {
        outputIndex = 0;
      } else if (finalEdge.sourceHandle === 'false' || finalEdge.sourceHandle === 'output_1') {
        outputIndex = 1;
      } else {
        // Try to parse as number (e.g., "output_2" -> 2)
        outputIndex = parseInt(finalEdge.sourceHandle.replace('output_', '')) || 0;
      }
    }

    if (!edgesBySource.has(finalEdge.source)) {
      edgesBySource.set(finalEdge.source, new Map());
    }

    const sourceMap = edgesBySource.get(finalEdge.source)!;
    if (!sourceMap.has(outputIndex)) {
      sourceMap.set(outputIndex, []);
    }

    sourceMap.get(outputIndex)!.push(finalEdge);
  });

  // Build n8n connections structure
  edgesBySource.forEach((outputMap, sourceNodeId) => {
    const sourceNodeName = nodeIdToName.get(sourceNodeId);
    if (!sourceNodeName) {
      console.warn(`⚠️  Source node ${sourceNodeId} not found in compiled nodes - skipping connections`);
      console.warn(`   Available node IDs: ${Array.from(nodeIdToName.keys()).join(', ')}`);
      return;
    }

    connections[sourceNodeName] = {
      main: [],
    };

    // Get the maximum output index to create the right array size
    const maxIndex = Math.max(...Array.from(outputMap.keys()));

    // Initialize array with empty arrays for each output
    for (let i = 0; i <= maxIndex; i++) {
      connections[sourceNodeName].main[i] = [];
    }

    // Fill in the connections
    outputMap.forEach((edges, outputIndex) => {
      edges.forEach((edge) => {
        const targetNodeName = nodeIdToName.get(edge.target);
        if (!targetNodeName) {
          console.warn(`⚠️  Target node ${edge.target} not found in compiled nodes - skipping connection`);
          return;
        }

        connections[sourceNodeName].main[outputIndex].push({
          node: targetNodeName,
          type: 'main',
          index: 0, // Target input index (usually 0 for single-input nodes)
        });
      });
    });
  });

  return connections;
}
