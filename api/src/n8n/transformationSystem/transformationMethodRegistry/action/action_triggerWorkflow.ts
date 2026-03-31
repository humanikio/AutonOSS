/**
 * Trigger Workflow Transformation
 *
 * This transformation handles three payload modes:
 * 1. 'passthrough' - Send all data from previous node: ={{ $json }}
 * 2. 'json' - Use raw JSON from user
 * 3. 'fields' - Build object from fixedCollection field pairs
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
import { buildBodyParameters, buildN8nObjectExpression } from '../utils/expressionHelpers';

export class TriggerWorkflowTransformation implements Transformation {
  readonly name = 'action_triggerWorkflow';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return config?.name === 'triggerWorkflow';
  }

  transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    const backendUrl = process.env.BACKEND_URL || 'https://backend.pulseline.io';
    const endpoint = config._pulseline?.apiEndpoint || '/api/workflows/workflows/trigger';

    const payloadMode = nodeParams.payloadMode || 'fields';

    // Build body object
    const bodyObj: Record<string, any> = {
      workflowId: nodeParams.workflowId,
    };

    // Handle payload based on mode
    if (payloadMode === 'passthrough') {
      // Mode 1: Pass through all data from previous node
      bodyObj.payload = '={{ $json }}';
    } else if (payloadMode === 'json') {
      // Mode 2: Use raw JSON from textarea
      bodyObj.payload = nodeParams.payload || '={{ $json }}';
    } else if (payloadMode === 'fields') {
      // Mode 3: Convert fixedCollection field pairs → n8n expression object
      // This uses the helper that properly unwraps nested expressions
      const fields = nodeParams.payloadFields?.field || [];
      bodyObj.payload = buildN8nObjectExpression(fields, '={{ $json }}');
    }

    // Convert to body parameters array
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
            neverError: true,
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

    return {
      nodes: [httpNode],
      internalEdges: [],
      replacements: {},
      metadata: {
        transformationName: this.name,
        originalNodeId: id,
        originalNodeType: node.type,
        nodesCreated: 1,
        custom: {
          endpoint,
          workflowId: nodeParams.workflowId,
          payloadMode,
        },
      },
    };
  }
}

export const action_triggerWorkflow = new TriggerWorkflowTransformation();
