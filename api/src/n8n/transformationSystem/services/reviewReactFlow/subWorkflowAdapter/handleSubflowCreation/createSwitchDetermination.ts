/**
 * Create Switch Determination Node
 *
 * Creates an n8n switch node with determination function to route
 * workflow execution to the correct subflow group based on runtime conditions.
 */

import type { ReactFlowNode } from '../../../../transformationMethodRegistry/types/transformationMethodTypes';
import type { SubflowGroup } from '../subflowMethods/groupingRules/milestoneWait';
import { getDeterminationFunction } from '../subflowMethods/determinationFunctions';

/**
 * Switch node creation result
 */
export interface SwitchNodeResult {
  node: ReactFlowNode;
  expression: string;
}

/**
 * Create switch node for subflow routing
 *
 * The switch node uses a determination function to compute which
 * case/group should be executed at runtime.
 *
 * @param pathId - Unique path identifier (e.g., 'path1')
 * @param triggerType - Type of subflow trigger (e.g., 'milestoneWait')
 * @param groups - Array of subflow groups with their case values
 * @param triggerNodeId - ID of the first trigger node (for data access)
 * @param position - Position for the switch node in the canvas
 * @returns Switch node configuration
 */
export function createSwitchDetermination(
  pathId: string,
  triggerType: string,
  groups: SubflowGroup[],
  triggerNodeId: string,
  position: { x: number; y: number }
): SwitchNodeResult {
  console.log(`   =  Creating switch determination for ${pathId}...`);

  // Get determination function for this trigger type
  const determinationFn = getDeterminationFunction(triggerType);

  // Extract milestone values from groups
  const milestones = groups
    .filter(g => g.caseValue !== 'none')
    .map(g => g.caseValue);

  // Generate determination expression
  const expression = determinationFn.generateExpression(triggerNodeId, milestones);

  console.log(`   =� Generated expression for ${milestones.length} cases`);

  // Create switch node using expression mode
  // The expression returns a number (group index) which n8n uses to route to that output
  const switchNode: ReactFlowNode = {
    id: `${pathId}-switch`,
    type: 'switch',
    position,
    data: {
      nodeName: 'switch', // NodeRegistry lookup uses short name
      parameters: {
        mode: 'expression',
        output: expression, // Expression that returns the output index (0, 1, 2, etc.)
        numberOutputs: groups.length, // Total number of output branches
      },
      typeVersion: 3,
    },
  };

  console.log(`    Created switch node: ${switchNode.id}`);
  console.log(`    Outputs: ${groups.length} (${groups.map(g => g.caseName).join(', ')})`);
  console.log(`    Expression returns: group index (0-${groups.length - 1})`);

  return {
    node: switchNode,
    expression,
  };
}

/**
 * Calculate position for switch node
 *
 * Places switch node before the first node in the linear path.
 *
 * @param firstNodePosition - Position of first node in original path
 * @returns Position for switch node
 */
export function calculateSwitchPosition(firstNodePosition: { x: number; y: number }): {
  x: number;
  y: number;
} {
  return {
    x: firstNodePosition.x - 300, // 300px to the left
    y: firstNodePosition.y,
  };
}

/**
 * Validate switch node configuration
 *
 * Ensures switch node is properly configured with all required fields.
 *
 * @param switchNode - Switch node to validate
 * @param groups - Expected subflow groups
 * @returns Validation result
 */
export function validateSwitchNode(
  switchNode: ReactFlowNode,
  groups: SubflowGroup[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (switchNode.type !== 'switch') {
    errors.push(`Node type should be 'switch', got '${switchNode.type}'`);
  }

  if (!switchNode.data?.parameters?.output) {
    errors.push('Missing determination expression (output parameter)');
  }

  const numberOutputs = switchNode.data?.parameters?.numberOutputs;
  if (numberOutputs !== groups.length) {
    errors.push(
      `Output count mismatch: expected ${groups.length}, got ${numberOutputs}`
    );
  }

  if (errors.length > 0) {
    console.error(`   L Switch validation failed with ${errors.length} errors`);
  } else {
    console.log(`    Switch validation passed`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
