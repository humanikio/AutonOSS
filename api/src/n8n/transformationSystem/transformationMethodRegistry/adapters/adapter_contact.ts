/**
 * Contact Adapter Transformation
 *
 * Transforms contactAdapter node into n8n HTTP Request node that fetches complete contact data.
 * This adapter is auto-injected by the custom field resolver to make contact fields available
 * to downstream nodes.
 *
 * Transformation: contactAdapter → n8n HttpRequest (GET)
 */

import type {
  Transformation,
  ReactFlowNode,
  TransformationResult,
  TransformationContext,
} from '../types/transformationMethodTypes';
import type { INodeTypeDescription } from '../../../../workflows/services/nodeRegistry/types';
import type {
  HttpRequestNodeConfig,
  HttpRequestParameters,
} from '../n8n/nodeSchemas/HttpRequest.schema';
import { HTTP_REQUEST_DEFAULTS, createHeaderParameter } from '../n8n/nodeSchemas/HttpRequest.schema';
import { unwrapExpression } from '../utils/expressionHelpers';

export class ContactAdapterTransformation implements Transformation {
  readonly name = 'adapter_contact';
  readonly priority = 100;

  /**
   * Matches contactAdapter nodes
   */
  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return !!config?._pulseline?.isAdapter && config._pulseline.adapterType === 'contact';
  }

  /**
   * Transform contactAdapter to n8n HTTP Request
   */
  transform(
    node: ReactFlowNode,
    config: INodeTypeDescription,
    context: TransformationContext
  ): TransformationResult {
    const { id, position, data } = node;
    const { parameters = {} } = data;

    // Get contact ID expression from parameters
    // This is auto-populated by custom field resolver (e.g., "={{$json.body.contactId}}")
    const contactIdExpression = parameters.contactId || '={{$json.body.contactId}}';

    // Build the API URL using the OLD CONVERTER PATTERN
    // We need to unwrap the n8n expression and build a concatenated URL expression
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

    // Unwrap the contactId expression: ={{$json.body.contactId}} → $json.body.contactId
    const unwrappedExpr = unwrapExpression(contactIdExpression);

    // Build URL with concatenation: ={{ 'baseUrl' + contactId + 'path' }}
    // IMPORTANT: Wrap unwrappedExpr in parentheses to handle || expressions correctly
    // Without parens: 'url' + $json.body?.contactId || $json.contactId + '/path'
    //   → evaluates as: 'url' + ($json.body?.contactId || ($json.contactId + '/path')) - WRONG!
    // With parens: 'url' + ($json.body?.contactId || $json.contactId) + '/path' - CORRECT!
    const urlExpression = `={{ '${backendUrl}' + '/api/contacts/' + (${unwrappedExpr}) + '/flattened' }}`;

    // Build headers object (will be stringified like old system)
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer TENANT_API_KEY_PLACEHOLDER`, // Will be replaced by injectAuthenticationKey
    };

    // Create HTTP request parameters using OLD CONVERTER PATTERN
    const httpParameters: HttpRequestParameters = {
      method: 'GET',
      url: urlExpression,
      authentication: 'none', // We handle auth via headers
      sendHeaders: true,
      specifyHeaders: 'json', // Use JSON format like old system
      jsonHeaders: JSON.stringify(headers), // Stringify headers like old system
      responseFormat: 'json',
      options: {
        response: {
          response: {
            neverError: true, // Continue workflow even if contact fetch fails
          },
        },
      },
    };

    // Create n8n HTTP Request node
    const httpNode: HttpRequestNodeConfig = {
      id,
      name: id,
      type: HTTP_REQUEST_DEFAULTS.type,
      typeVersion: HTTP_REQUEST_DEFAULTS.typeVersion,
      position: [position.x, position.y],
      parameters: httpParameters,
      continueOnFail: true, // Allow workflow to continue even on error
    };

    return {
      nodes: [httpNode],
      internalEdges: [], // No internal edges - simple 1:1 mapping
      replacements: {}, // No replacements - simple 1:1 mapping
      metadata: {
        transformationName: this.name,
        originalNodeId: id,
        originalNodeType: node.type,
        nodesCreated: 1,
        custom: {
          adapterType: 'contact',
          apiEndpoint: config._pulseline?.apiEndpoint || '',
          contactIdExpression,
        },
      },
    };
  }
}

export const adapterContact = new ContactAdapterTransformation();
