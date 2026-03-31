/**
 * Inbound Agent SMS Transformation
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

export class InboundAgentSmsTransformation implements Transformation {
  readonly name = 'sms_inboundAgent';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return config?.name === 'pulselineInboundAgentSms';
  }

  transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    const backendUrl = process.env.BACKEND_URL || 'https://backend.pulseline.io';
    const endpoint = config._pulseline?.apiEndpoint || '/api/agent-communication/sms/inbound';

    // Build body object from node parameters
    const bodyObj: Record<string, any> = {
      agentId: nodeParams.agentId,
      messageContent: nodeParams.messageContent || '={{$json.body.Body}}',
      contactId: nodeParams.contactId || '={{$json.contactId}}',
      action: nodeParams.action || 'inbound',
      from: nodeParams.from || '={{$json.body.From}}',
      to: nodeParams.to,
    };

    // Optional action ID
    if (nodeParams.actionId) {
      bodyObj.actionId = nodeParams.actionId;
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
        custom: { endpoint },
      },
    };
  }
}

export const sms_inboundAgent = new InboundAgentSmsTransformation();
