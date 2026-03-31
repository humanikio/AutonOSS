/**
 * Milestone Wait Grouping Rules
 *
 * Defines how to group nodes for milestone wait subflows.
 *
 * Rule: N triggers → N groups
 * - Group 1: All nodes from trigger1 onwards
 * - Group 2: All nodes from trigger2 onwards
 * - Group 3: All nodes from trigger3 onwards
 * - etc.
 */

import type { ReactFlowNode, ReactFlowEdge } from '../../../../../transformationMethodRegistry/types/transformationMethodTypes';

/**
 * Subflow group (node chain for one switch case)
 */
export interface SubflowGroup {
  caseValue: string;        // Milestone value (e.g., '1_hour_before')
  caseName: string;         // Display name (e.g., '1 Hour Before')
  startNodeId: string;      // Trigger node this group starts from
  nodes: ReactFlowNode[];   // Copied nodes with unique IDs
  edges: ReactFlowEdge[];   // Rewired edges for this group
  groupIndex: number;       // 0-based index (group 0, group 1, etc.)
}

/**
 * Grouping rule function signature
 */
export type GroupingRuleFunction = (
  triggers: ReactFlowNode[],
  allNodesInPath: ReactFlowNode[],
  allEdges: ReactFlowEdge[]
) => SubflowGroup[];

/**
 * Milestone wait grouping implementation
 *
 * Creates N groups where each group contains all nodes from that trigger onwards.
 * Nodes are copied with unique IDs using suffix pattern: {originalId}-case{N}
 */
export const milestoneWaitGrouping: GroupingRuleFunction = (
  triggers: ReactFlowNode[],
  allNodesInPath: ReactFlowNode[],
  allEdges: ReactFlowEdge[]
): SubflowGroup[] => {
  console.log(`📋 Creating groups for ${triggers.length} milestone triggers...`);

  const groups: SubflowGroup[] = [];

  // Sort triggers by their position in the path (earliest first)
  const sortedTriggers = [...triggers].sort((a, b) => {
    const indexA = allNodesInPath.findIndex(n => n.id === a.id);
    const indexB = allNodesInPath.findIndex(n => n.id === b.id);
    return indexA - indexB;
  });

  // Create one group per trigger
  sortedTriggers.forEach((trigger, groupIndex) => {
    const triggerIndex = allNodesInPath.findIndex(n => n.id === trigger.id);

    // Get all nodes from this trigger onwards
    const nodesFromTrigger = allNodesInPath.slice(triggerIndex);

    // Extract milestone value
    const milestoneValue = trigger.data?.parameters?.milestone || 'unknown';
    const milestoneName = getMilestoneName(milestoneValue);

    // Copy nodes with unique IDs
    const copiedNodes = copyNodesWithSuffix(nodesFromTrigger, `case${groupIndex}`);

    // Get edges for these nodes and rewire to copied IDs
    const groupEdges = extractAndRewireEdges(
      nodesFromTrigger,
      allEdges,
      `case${groupIndex}`
    );

    groups.push({
      caseValue: milestoneValue,
      caseName: milestoneName,
      startNodeId: trigger.id,
      nodes: copiedNodes,
      edges: groupEdges,
      groupIndex
    });

    console.log(`   📦 Group ${groupIndex}: ${milestoneName} (${copiedNodes.length} nodes)`);
  });

  // Add "none" group (all waits are past - skip to end)
  const lastGroup = createNoneGroup(allNodesInPath, allEdges, groups.length);
  groups.push(lastGroup);
  console.log(`   📦 Group ${lastGroup.groupIndex}: None/All Past (${lastGroup.nodes.length} nodes)`);

  return groups;
};

/**
 * Copy nodes with unique ID suffix
 */
function copyNodesWithSuffix(
  nodes: ReactFlowNode[],
  suffix: string
): ReactFlowNode[] {
  return nodes.map(node => ({
    ...node,
    id: `${node.id}-${suffix}`,
    position: {
      ...node.position,
      x: node.position.x + (parseInt(suffix.replace('case', '')) * 350) // Offset horizontally
    },
    data: {
      ...node.data,
      _originalId: node.id,
      _groupSuffix: suffix
    }
  }));
}

/**
 * Extract edges for nodes and rewire to use copied node IDs
 */
function extractAndRewireEdges(
  originalNodes: ReactFlowNode[],
  allEdges: ReactFlowEdge[],
  suffix: string
): ReactFlowEdge[] {
  const nodeIds = new Set(originalNodes.map(n => n.id));

  // Find edges between nodes in this group
  const relevantEdges = allEdges.filter(edge =>
    nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  // Rewire edges to use copied node IDs
  return relevantEdges.map(edge => ({
    ...edge,
    id: `${edge.id}-${suffix}`,
    source: `${edge.source}-${suffix}`,
    target: `${edge.target}-${suffix}`
  }));
}

/**
 * Create "none" group for when all milestones are past
 * This contains only non-wait nodes after the last wait
 */
function createNoneGroup(
  allNodesInPath: ReactFlowNode[],
  allEdges: ReactFlowEdge[],
  groupIndex: number
): SubflowGroup {
  // Find nodes after the last wait node
  const waitNodeIndices = allNodesInPath
    .map((n, i) => n.type === 'wait' ? i : -1)
    .filter(i => i !== -1);

  const lastWaitIndex = waitNodeIndices.length > 0
    ? Math.max(...waitNodeIndices)
    : -1;

  // Get nodes after last wait (excluding the wait itself)
  const nodesAfterWaits = lastWaitIndex >= 0
    ? allNodesInPath.slice(lastWaitIndex + 1)
    : [];

  const suffix = `case${groupIndex}`;
  const copiedNodes = copyNodesWithSuffix(nodesAfterWaits, suffix);
  const groupEdges = extractAndRewireEdges(nodesAfterWaits, allEdges, suffix);

  return {
    caseValue: 'none',
    caseName: 'All Past',
    startNodeId: nodesAfterWaits[0]?.id || '',
    nodes: copiedNodes,
    edges: groupEdges,
    groupIndex
  };
}

/**
 * Convert milestone value to display name
 */
function getMilestoneName(value: string): string {
  const names: Record<string, string> = {
    '5_days_before': '5 Days Before',
    '4_days_before': '4 Days Before',
    '3_days_before': '3 Days Before',
    '2_days_before': '2 Days Before',
    '1_day_before': '1 Day Before',
    '1_hour_before': '1 Hour Before',
    '30_minutes_before': '30 Minutes Before',
    '10_minutes_before': '10 Minutes Before',
    'event_start': 'Event Start',
    'event_completed': 'Event Completed'
  };

  return names[value] || value;
}
