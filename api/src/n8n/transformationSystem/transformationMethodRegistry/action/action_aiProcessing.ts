/**
 * AI Processing Transformation
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
import { buildBodyParameters } from '../utils/expressionHelpers';

export class AiProcessingTransformation implements Transformation {
  readonly name = 'action_aiProcessing';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return config?.name === 'aiProcessing';
  }

  transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    const backendUrl = process.env.BACKEND_URL || 'https://backend.pulseline.io';
    const endpoint = config._pulseline?.apiEndpoint || '/api/workflows/ai-processing/process';

    // Build body object from node parameters
    const bodyObj: Record<string, any> = {
      workflowId: nodeParams.workflowId,
      nodeId: nodeParams.nodeId,
      nodeName: nodeParams.nodeName || 'aiProcessing',
      model: nodeParams.model || 'claude-sonnet-4-5-20250929',
      prompt: nodeParams.prompt,
    };

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
        custom: { endpoint, model: nodeParams.model },
      },
    };
  }
}

export const action_aiProcessing = new AiProcessingTransformation();
