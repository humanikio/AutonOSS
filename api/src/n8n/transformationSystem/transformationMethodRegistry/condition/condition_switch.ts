/**
 * Switch Condition Transformation
 * Transforms Pulseline Switch node to native n8n Switch node (v3)
 * Handles expression-based routing for subflow determination
 */

import type {
  Transformation,
  TransformationResult,
  TransformationContext,
  ReactFlowNode,
} from '../types/transformationMethodTypes';
import type { INodeTypeDescription } from '../../../../workflows/services/nodeRegistry/types';
import type { SwitchNodeConfig, SwitchExpressionParameters } from '../n8n/nodeSchemas/Switch.schema';
import { SWITCH_NODE_DEFAULTS } from '../n8n/nodeSchemas/Switch.schema';

export class SwitchConditionTransformation implements Transformation {
  readonly name = 'condition_switch';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return config?.name === 'switch';
  }

  transform(
    node: ReactFlowNode,
    config: INodeTypeDescription,
    context: TransformationContext
  ): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    console.log(`\n🔧 Switch Transformation for ${id}:`);
    console.log(`   Parameters:`, JSON.stringify(nodeParams, null, 2));

    // Extract switch parameters
    const mode = nodeParams.mode || 'expression';
    let expression = nodeParams.expression || nodeParams.output || '';
    const numberOutputs = nodeParams.numberOutputs || nodeParams.rules?.rules?.length || 4;

    console.log(`   Extracted expression: ${expression ? expression.substring(0, 100) + '...' : 'EMPTY'}`);
    console.log(`   Number of outputs: ${numberOutputs}`);

    // Wrap expression with n8n expression syntax if not already wrapped
    if (expression && !expression.trim().startsWith('={{')) {
      expression = `={{ ${expression} }}`;
      console.log(`   ✅ Wrapped expression with ={{ }}`);
    }

    // Build expression-based switch parameters
    const switchParameters: SwitchExpressionParameters = {
      mode: 'expression',
      output: expression, // The determination expression
      numberOutputs,
    };

    const switchNode: SwitchNodeConfig = {
      id,
      name: id, // Use node ID for stable references
      type: 'n8n-nodes-base.switch',
      typeVersion: 3,
      position: [position.x, position.y],
      parameters: switchParameters,
    };

    console.log(`   ✅ Created n8n switch node:`);
    console.log(`      mode: ${switchParameters.mode}`);
    console.log(`      output: ${switchParameters.output ? String(switchParameters.output).substring(0, 100) + '...' : 'EMPTY'}`);
    console.log(`      numberOutputs: ${switchParameters.numberOutputs}`);

    return {
      nodes: [switchNode],
      internalEdges: [],
      replacements: {},
      metadata: {
        transformationName: this.name,
        originalNodeId: id,
        originalNodeType: node.type,
        nodesCreated: 1,
        custom: {
          mode,
          numberOutputs,
          hasExpression: !!expression,
        },
      },
    };
  }
}

export const condition_switch = new SwitchConditionTransformation();
