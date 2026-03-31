/**
 * Phone Outbound Call Transformation
 * Transforms Pulseline Outbound Call node to HTTP Request node
 * Initiates AI agent phone calls with optional contact creation
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

export class PhoneOutboundCallTransformation implements Transformation {
  readonly name = 'phone_outboundCall';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return config?.name === 'pulselineOutboundCall';
  }

  transform(
    node: ReactFlowNode,
    config: INodeTypeDescription,
    context: TransformationContext
  ): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    const backendUrl = process.env.BACKEND_URL || 'https://backend.pulseline.io';
    const endpoint = config._pulseline?.apiEndpoint || '/api/agent-communication/phone/start-call';

    // Build request body from node parameters
    const bodyObj: Record<string, any> = {
      agentId: nodeParams.agentId,
      targetPhoneNumber: nodeParams.targetPhoneNumber || '={{$contact.phoneNumber}}',
      contactId: nodeParams.contactId || '={{$contact.contactId}}',
      actionId: nodeParams.actionId,
      // Optional contact creation fields
      first_name: nodeParams.first_name,
      last_name: nodeParams.last_name,
      full_name: nodeParams.full_name,
      email: nodeParams.email,
      phone: nodeParams.phone,
    };

    const bodyParameters = buildBodyParameters(bodyObj);

    // Standard Pulseline authentication headers
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
          agentId: nodeParams.agentId,
          actionId: nodeParams.actionId,
        },
      },
    };
  }
}

export const phone_outboundCall = new PhoneOutboundCallTransformation();
