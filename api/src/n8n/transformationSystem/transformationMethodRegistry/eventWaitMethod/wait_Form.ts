/**
 * Wait Form Transformation
 * Transforms wait node in 'form' mode to native n8n Wait node
 */

import type {
  Transformation,
  TransformationResult,
  TransformationContext,
  ReactFlowNode,
} from '../types/transformationMethodTypes';
import type { INodeTypeDescription } from '../../../../workflows/services/nodeRegistry/types';
import type { WaitNodeConfig, WaitNodeParameters } from '../n8n/nodeSchemas/Wait.schema';
import { WAIT_NODE_DEFAULTS } from '../n8n/nodeSchemas/Wait.schema';

export class WaitFormTransformation implements Transformation {
  readonly name = 'wait_form';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    if (config?.name !== 'wait') return false;
    const resume = node.data?.parameters?.resume;
    return resume === 'form';
  }

  transform(
    node: ReactFlowNode,
    config: INodeTypeDescription,
    context: TransformationContext
  ): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    const waitParameters: WaitNodeParameters = {
      resume: 'form',
    };

    const waitNode: WaitNodeConfig = {
      id,
      name: id, // Use node ID for stable references (matches legacy pattern)
      type: WAIT_NODE_DEFAULTS.type,
      typeVersion: WAIT_NODE_DEFAULTS.typeVersion,
      position: [position.x, position.y],
      parameters: waitParameters,
    };

    return {
      nodes: [waitNode],
      internalEdges: [],
      replacements: {},
      metadata: {
        transformationName: this.name,
        originalNodeId: id,
        originalNodeType: node.type,
        nodesCreated: 1,
        custom: {
          waitMode: 'form',
        },
      },
    };
  }
}

export const wait_form = new WaitFormTransformation();
