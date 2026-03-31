/**
 * Find Contact Transformation (with Conditional IF Node)
 *
 * Converts: pulselineFindContact → HTTP Request + IF Node
 *
 * This transformation creates TWO nodes:
 * 1. HTTP Request node - calls /api/contacts/find
 * 2. IF node - checks $json.found field for conditional routing
 *
 * Output routing:
 * - output_0 (Contact Found) → IF true branch
 * - output_1 (Contact Not Found) → IF false branch
 */

import type {
  Transformation,
  TransformationResult,
  TransformationContext,
  ReactFlowNode,
} from '../types/transformationMethodTypes';
import type { INodeTypeDescription } from '../../../../workflows/services/nodeRegistry/types';
import type { HttpRequestNodeConfig, HttpRequestParameters } from '../n8n/nodeSchemas/HttpRequest.schema';
import { HTTP_REQUEST_DEFAULTS } from '../n8n/nodeSchemas/HttpRequest.schema';
import type { IfNodeConfig, IfNodeParameters } from '../n8n/nodeSchemas/If.schema';
import { createBooleanCondition } from '../n8n/nodeSchemas/If.schema';
import { buildBodyParameters } from '../utils/expressionHelpers';

export class FindContactTransformation implements Transformation {
  readonly name = 'contact_find';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return config?.name === 'pulselineFindContact';
  }

  transform(
    node: ReactFlowNode,
    config: INodeTypeDescription,
    context: TransformationContext
  ): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    const backendUrl = process.env.BACKEND_URL || 'https://backend.pulseline.io';
    const endpoint = config._pulseline?.apiEndpoint || '/api/contacts/find';

    // ========================================================================
    // 1. Create HTTP Request Node
    // ========================================================================
    const bodyObj: Record<string, any> = {
      value: nodeParams.value,
    };

    const bodyParameters = buildBodyParameters(bodyObj);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER',
    };

    const httpParameters: HttpRequestParameters = {
      method: 'POST',
      url: `${backendUrl}${endpoint}`,
      authentication: 'none',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'keypair',
      bodyParameters: {
        parameters: bodyParameters,
      },
      sendHeaders: true,
      specifyHeaders: 'json',
      jsonHeaders: JSON.stringify(headers),
      options: {
        response: {
          response: {
            neverError: true, // CRITICAL: Continue even if not found (404/500)
          },
        },
      },
    };

    const httpNode: HttpRequestNodeConfig = {
      id,
      name: id, // Use node ID for stable references (matches legacy pattern)
      type: HTTP_REQUEST_DEFAULTS.type,
      typeVersion: HTTP_REQUEST_DEFAULTS.typeVersion,
      position: [position.x, position.y],
      parameters: httpParameters,
    };

    // ========================================================================
    // 2. Create IF Node (for conditional routing)
    // ========================================================================
    const ifNodeId = `${id}_if`;

    const conditionalConfig = config._pulseline?.conditionalOutput;
    const checkField = conditionalConfig?.field || 'found';

    const ifParameters: IfNodeParameters = {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
        },
        conditions: [
          createBooleanCondition('1', checkField, true) // Check if $json.found === true
        ],
        combinator: 'and',
      },
      options: {},
    };

    const ifNode: IfNodeConfig = {
      id: ifNodeId,
      name: ifNodeId, // Use ID as name for stable references
      type: 'n8n-nodes-base.if',
      typeVersion: 2,
      position: [position.x + 300, position.y], // Position 300px to the right
      parameters: ifParameters,
    };

    // ========================================================================
    // 3. Return Transformation Result
    // ========================================================================
    return {
      nodes: [httpNode, ifNode], // TWO nodes created!

      // Internal edge: HTTP → IF
      internalEdges: [
        { from: id, to: ifNodeId }
      ],

      // Replacements: Incoming connects to HTTP, Outgoing from IF
      replacements: {
        [id]: {
          incomingTarget: id,        // Previous nodes connect to HTTP node
          outgoingSource: ifNodeId   // Next nodes connect FROM IF node
        }
      },

      metadata: {
        transformationName: this.name,
        originalNodeId: id,
        originalNodeType: node.type,
        nodesCreated: 2,
        custom: {
          hasConditionalOutput: true,
          conditionalField: checkField,
          httpNodeId: id,
          ifNodeId: ifNodeId,
          trueLabel: conditionalConfig?.trueLabel || 'Contact Found',
          falseLabel: conditionalConfig?.falseLabel || 'Contact Not Found',
        },
      },
    };
  }
}

export const contact_find = new FindContactTransformation();
