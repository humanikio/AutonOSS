/**
 * Validate Revised Flow
 *
 * Comprehensive validation of the workflow after subflow creation.
 * Ensures structural integrity, node/edge validity, and logical consistency.
 */

import type { ReactFlowNode, ReactFlowEdge } from '../../../transformationMethodRegistry/types/transformationMethodTypes';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    switchNodes: number;
    orphanedNodes: number;
    unreachableNodes: number;
    cyclesDetected: number;
  };
}

/**
 * Validate revised workflow after subflow creation
 *
 * Performs comprehensive checks:
 * - Node ID uniqueness
 * - Edge validity (source/target exist)
 * - Graph connectivity
 * - No orphaned nodes
 * - No cycles (DAG validation)
 * - Switch node configuration
 *
 * @param nodes - All nodes in the workflow
 * @param edges - All edges in the workflow
 * @returns Validation result with errors and warnings
 */
export function validateRevisedFlow(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): ValidationResult {
  console.log(`\n🔍 Validating revised flow...`);
  console.log(`   Nodes: ${nodes.length}`);
  console.log(`   Edges: ${edges.length}`);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Initialize stats
  const stats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    switchNodes: 0,
    orphanedNodes: 0,
    unreachableNodes: 0,
    cyclesDetected: 0,
  };

  // VALIDATION 1: Node ID uniqueness
  console.log(`   Checking node ID uniqueness...`);
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

    // Count switch nodes
    if (node.type === 'switch') {
      stats.switchNodes++;
    }
  });

  // VALIDATION 2: Edge validity
  console.log(`   Checking edge validity...`);
  edges.forEach(edge => {
    if (!edge.id) {
      errors.push('Edge missing ID');
      return;
    }
    if (!edge.source) {
      errors.push(`Edge ${edge.id} missing source`);
    } else if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references non-existent source: ${edge.source}`);
    }
    if (!edge.target) {
      errors.push(`Edge ${edge.id} missing target`);
    } else if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references non-existent target: ${edge.target}`);
    }
  });

  // Stop here if basic validation failed
  if (errors.length > 0) {
    console.error(`   ❌ Basic validation failed with ${errors.length} errors`);
    return { valid: false, errors, warnings, stats };
  }

  // VALIDATION 3: Build adjacency lists
  const incomingEdges = new Map<string, ReactFlowEdge[]>();
  const outgoingEdges = new Map<string, ReactFlowEdge[]>();

  nodes.forEach(node => {
    incomingEdges.set(node.id, []);
    outgoingEdges.set(node.id, []);
  });

  edges.forEach(edge => {
    outgoingEdges.get(edge.source)?.push(edge);
    incomingEdges.get(edge.target)?.push(edge);
  });

  // VALIDATION 4: Orphaned nodes (no incoming or outgoing edges)
  console.log(`   Checking for orphaned nodes...`);
  nodes.forEach(node => {
    const incoming = incomingEdges.get(node.id) || [];
    const outgoing = outgoingEdges.get(node.id) || [];

    if (incoming.length === 0 && outgoing.length === 0) {
      if (node.type !== 'trigger') {
        warnings.push(`Orphaned node (no edges): ${node.id}`);
        stats.orphanedNodes++;
      }
    }
  });

  // VALIDATION 5: Find root nodes (triggers)
  const rootNodes = nodes.filter(node => {
    const incoming = incomingEdges.get(node.id) || [];
    return incoming.length === 0;
  });

  if (rootNodes.length === 0) {
    errors.push('No root nodes (triggers) found in workflow');
    return { valid: false, errors, warnings, stats };
  }

  // VALIDATION 6: Reachability check
  console.log(`   Checking node reachability from ${rootNodes.length} root(s)...`);
  const reachable = new Set<string>();

  function dfs(nodeId: string, visited: Set<string>) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    reachable.add(nodeId);

    const outgoing = outgoingEdges.get(nodeId) || [];
    outgoing.forEach(edge => {
      dfs(edge.target, visited);
    });
  }

  rootNodes.forEach(root => {
    dfs(root.id, new Set());
  });

  nodes.forEach(node => {
    if (!reachable.has(node.id)) {
      warnings.push(`Unreachable node: ${node.id}`);
      stats.unreachableNodes++;
    }
  });

  // VALIDATION 7: Cycle detection (DAG check)
  console.log(`   Checking for cycles...`);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true; // Cycle detected
    }
    if (visited.has(nodeId)) {
      return false; // Already processed
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoing = outgoingEdges.get(nodeId) || [];
    for (const edge of outgoing) {
      if (hasCycle(edge.target)) {
        stats.cyclesDetected++;
        errors.push(`Cycle detected involving node: ${nodeId}`);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  rootNodes.forEach(root => {
    hasCycle(root.id);
  });

  // VALIDATION 8: Switch node configuration
  console.log(`   Validating switch nodes...`);
  nodes.forEach(node => {
    if (node.type === 'switch') {
      // Check switch has determination expression or rules
      const params = node.data?.parameters;
      if (!params) {
        errors.push(`Switch node ${node.id} missing parameters`);
        return;
      }

      // For expression mode (v3), check 'output' parameter
      // For rules mode, check 'rules' parameter
      if (!params.output && !params.expression && !params.rules) {
        errors.push(`Switch node ${node.id} missing output expression or rules`);
      }

      // Check switch has outgoing edges
      const outgoing = outgoingEdges.get(node.id) || [];
      if (outgoing.length === 0) {
        warnings.push(`Switch node ${node.id} has no outgoing edges`);
      }
    }
  });

  // Final result
  const valid = errors.length === 0;

  if (valid) {
    console.log(`   ✅ Validation passed`);
    if (warnings.length > 0) {
      console.warn(`   ⚠️  ${warnings.length} warnings`);
    }
  } else {
    console.error(`   ❌ Validation failed with ${errors.length} errors`);
  }

  console.log(`\n📊 Validation stats:`);
  console.log(`   Total nodes: ${stats.totalNodes}`);
  console.log(`   Total edges: ${stats.totalEdges}`);
  console.log(`   Switch nodes: ${stats.switchNodes}`);
  console.log(`   Orphaned nodes: ${stats.orphanedNodes}`);
  console.log(`   Unreachable nodes: ${stats.unreachableNodes}`);
  console.log(`   Cycles detected: ${stats.cyclesDetected}`);

  return {
    valid,
    errors,
    warnings,
    stats,
  };
}

/**
 * Quick validation (basic checks only)
 *
 * Performs only essential validation for fast checks.
 *
 * @param nodes - All nodes in the workflow
 * @param edges - All edges in the workflow
 * @returns True if basic validation passes
 */
export function quickValidate(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): boolean {
  // Check node ID uniqueness
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (!node.id || nodeIds.has(node.id)) {
      return false;
    }
    nodeIds.add(node.id);
  }

  // Check edge references
  for (const edge of edges) {
    if (!edge.id || !edge.source || !edge.target) {
      return false;
    }
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return false;
    }
  }

  return true;
}
