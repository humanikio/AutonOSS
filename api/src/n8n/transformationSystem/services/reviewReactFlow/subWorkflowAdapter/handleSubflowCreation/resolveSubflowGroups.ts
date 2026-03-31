/**
 * Resolve Subflow Groups
 *
 * Uses grouping rules registry to create subflow groups for a linear path.
 * Groups define how nodes are duplicated and organized for each switch case.
 */

import type { ReactFlowNode, ReactFlowEdge } from '../../../../transformationMethodRegistry/types/transformationMethodTypes';
import type { SubflowPath } from '../memory/cacheLinearPath';
import type { SubflowGroup } from '../subflowMethods/groupingRules/milestoneWait';
import { getGroupingRules } from '../subflowMethods/groupingRules';

/**
 * Group resolution result
 */
export interface GroupResolutionResult {
  groups: SubflowGroup[];
  totalNodes: number;
  totalEdges: number;
}

/**
 * Resolve subflow groups for a linear path
 *
 * Uses the appropriate grouping rule (based on trigger type) to:
 * 1. Determine how many groups to create
 * 2. Decide which nodes belong in each group
 * 3. Copy nodes with unique IDs
 * 4. Rewire edges within each group
 *
 * @param path - Linear path with trigger nodes
 * @param allEdges - All edges in the workflow
 * @returns Array of subflow groups with copied nodes and edges
 */
export function resolveSubflowGroups(
  path: SubflowPath,
  allEdges: ReactFlowEdge[]
): GroupResolutionResult {
  console.log(`\n   =æ Resolving subflow groups for ${path.pathId}...`);
  console.log(`      Trigger type: ${path.triggerType}`);
  console.log(`      Trigger count: ${path.triggers.length}`);
  console.log(`      Path nodes: ${path.nodes.length}`);

  // Get grouping rules for this trigger type
  const groupingRule = getGroupingRules(path.triggerType);

  // Execute grouping rule
  const groups = groupingRule(path.triggers, path.nodes, allEdges);

  // Calculate totals
  const totalNodes = groups.reduce((sum, group) => sum + group.nodes.length, 0);
  const totalEdges = groups.reduce((sum, group) => sum + group.edges.length, 0);

  console.log(`    Created ${groups.length} groups:`);
  groups.forEach(group => {
    console.log(
      `      " ${group.caseName} (case${group.groupIndex}): ${group.nodes.length} nodes, ${group.edges.length} edges`
    );
  });
  console.log(`   =Ê Totals: ${totalNodes} nodes, ${totalEdges} edges`);

  return {
    groups,
    totalNodes,
    totalEdges,
  };
}

/**
 * Validate group resolution result
 *
 * Ensures groups are properly formed with valid node/edge references.
 *
 * @param result - Group resolution result to validate
 * @returns Validation result
 */
export function validateGroupResolution(result: GroupResolutionResult): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check that we have at least one group
  if (result.groups.length === 0) {
    errors.push('No groups created');
    return { valid: false, errors, warnings };
  }

  // Validate each group
  result.groups.forEach((group, index) => {
    // Check for empty groups
    if (group.nodes.length === 0) {
      warnings.push(`Group ${index} (${group.caseName}) has no nodes`);
    }

    // Check node ID uniqueness within group
    const nodeIds = new Set<string>();
    group.nodes.forEach(node => {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID in group ${index}: ${node.id}`);
      }
      nodeIds.add(node.id);
    });

    // Check edge references
    const groupNodeIds = new Set(group.nodes.map(n => n.id));
    group.edges.forEach(edge => {
      if (!groupNodeIds.has(edge.source)) {
        errors.push(
          `Edge ${edge.id} in group ${index} references non-existent source: ${edge.source}`
        );
      }
      if (!groupNodeIds.has(edge.target)) {
        errors.push(
          `Edge ${edge.id} in group ${index} references non-existent target: ${edge.target}`
        );
      }
    });

    // Check case value
    if (!group.caseValue || group.caseValue.trim() === '') {
      errors.push(`Group ${index} has empty case value`);
    }

    // Check group index
    if (group.groupIndex !== index) {
      warnings.push(
        `Group ${index} has mismatched groupIndex: ${group.groupIndex}`
      );
    }
  });

  // Check for duplicate case values
  const caseValues = result.groups.map(g => g.caseValue);
  const uniqueCaseValues = new Set(caseValues);
  if (uniqueCaseValues.size !== caseValues.length) {
    errors.push('Duplicate case values found across groups');
  }

  if (errors.length > 0) {
    console.error(`   L Group validation failed with ${errors.length} errors`);
  } else if (warnings.length > 0) {
    console.warn(`      Group validation passed with ${warnings.length} warnings`);
  } else {
    console.log(`    Group validation passed`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get all nodes from groups (flattened)
 *
 * @param groups - Subflow groups
 * @returns Array of all nodes across all groups
 */
export function getAllNodesFromGroups(groups: SubflowGroup[]): ReactFlowNode[] {
  return groups.flatMap(group => group.nodes);
}

/**
 * Get all edges from groups (flattened)
 *
 * @param groups - Subflow groups
 * @returns Array of all edges across all groups
 */
export function getAllEdgesFromGroups(groups: SubflowGroup[]): ReactFlowEdge[] {
  return groups.flatMap(group => group.edges);
}

/**
 * Find group by case value
 *
 * @param groups - Subflow groups
 * @param caseValue - Case value to search for
 * @returns Matching group or undefined
 */
export function findGroupByCaseValue(
  groups: SubflowGroup[],
  caseValue: string
): SubflowGroup | undefined {
  return groups.find(g => g.caseValue === caseValue);
}
