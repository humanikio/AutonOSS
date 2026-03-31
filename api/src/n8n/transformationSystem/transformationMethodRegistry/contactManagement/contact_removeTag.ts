/**
 * Remove Contact Tag Transformation
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

export class RemoveContactTagTransformation implements Transformation {
  readonly name = 'contact_removeTag';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return config?.name === 'pulselineRemoveContactTag';
  }

  transform(node: ReactFlowNode, config: INodeTypeDescription, context: TransformationContext): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    const backendUrl = process.env.BACKEND_URL || 'https://backend.pulseline.io';
    const endpoint = config._pulseline?.apiEndpoint || '/api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/remove';

    // Build URL with n8n expression concatenation
    const urlParts: string[] = [];
    let lastIndex = 0;
    const paramRegex = /\{\{\$parameter\["([^"]+)"\]\}\}/g;
    let match;
    let hasUrlExpressions = false;

    while ((match = paramRegex.exec(endpoint)) !== null) {
      hasUrlExpressions = true;

      // Add static part before this match
      if (match.index > lastIndex) {
        const staticPart = endpoint.substring(lastIndex, match.index);
        urlParts.push(`'${staticPart}'`);
      }

      // Add dynamic part
      const paramName = match[1];
      const userValue = nodeParams[paramName];

      if (userValue !== undefined && userValue !== '') {
        // User provided a value - check if it's an expression or literal
        const strValue = String(userValue).trim();

        if (strValue.startsWith('={{') || strValue.startsWith('{{')) {
          // It's an n8n expression - unwrap and use directly
          let expr = strValue;
          if (expr.startsWith('={{')) {
            expr = expr.slice(3, -2).trim(); // Remove ={{ and }}
          } else if (expr.startsWith('{{')) {
            expr = expr.slice(2, -2).trim(); // Remove {{ and }}
          }

          // Wrap expression in parentheses if it contains operators
          if (expr.includes('||') || expr.includes('&&') || expr.includes('?')) {
            expr = `(${expr})`;
          }

          urlParts.push(`encodeURIComponent(${expr})`);
        } else {
          // It's a literal value (like a UUID) - add as-is with quotes
          urlParts.push(`'${strValue}'`);
        }
      } else {
        // Default to $json.paramName
        urlParts.push(`encodeURIComponent($json.${paramName})`);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining static part
    if (lastIndex < endpoint.length) {
      const staticPart = endpoint.substring(lastIndex);
      if (staticPart) {
        urlParts.push(`'${staticPart}'`);
      }
    }

    // Build full URL using n8n expression syntax
    let fullUrl: string;
    if (hasUrlExpressions) {
      const urlExpression = `'${backendUrl}' + ${urlParts.join(' + ')}`;
      fullUrl = `={{ ${urlExpression} }}`;
    } else {
      fullUrl = `${backendUrl}${endpoint}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer TENANT_API_KEY_PLACEHOLDER',
    };

    const httpParameters: HttpRequestParameters = {
      method: 'POST',
      url: fullUrl,
      authentication: 'none',
      sendBody: false, // No body needed - contactId and tagId are in URL
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
        custom: { endpoint, contactId: nodeParams.contactId, tagId: nodeParams.tagId },
      },
    };
  }
}

export const contact_removeTag = new RemoveContactTagTransformation();
