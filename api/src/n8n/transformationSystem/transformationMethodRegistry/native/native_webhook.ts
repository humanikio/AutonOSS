/**
 * Native Webhook Transformation
 *
 * Transforms native n8n webhook trigger nodes.
 * This is a direct 1:1 mapping since the webhook node is already a valid n8n node.
 *
 * Transformation: webhook → n8n-nodes-base.webhook (direct mapping)
 */

import type {
  Transformation,
  ReactFlowNode,
  TransformationResult,
  TransformationContext,
} from '../types/transformationMethodTypes';
import type { INodeTypeDescription } from '../../../../workflows/services/nodeRegistry/types';
import type { WebhookNodeConfig, WebhookNodeParameters } from '../n8n/nodeSchemas/Webhook.schema';
import { WEBHOOK_NODE_DEFAULTS, createWebhookParameters } from '../n8n/nodeSchemas/Webhook.schema';

export class NativeWebhookTransformation implements Transformation {
  readonly name = 'native_webhook';
  readonly priority = 100;

  /**
   * Matches native webhook nodes
   */
  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    // Match nodes with name 'webhook' that don't have custom _pulseline.isTrigger flag
    return node.type === 'webhook' && !config?._pulseline?.isTrigger;
  }

  /**
   * Transform native webhook to n8n webhook
   * Direct 1:1 mapping - no complex transformations needed
   */
  transform(
    node: ReactFlowNode,
    config: INodeTypeDescription | undefined,
    context: TransformationContext
  ): TransformationResult {
    const { id, position, data } = node;
    const { parameters = {} } = data;

    // Extract webhook parameters from ReactFlow node
    const httpMethod = parameters.httpMethod || 'POST';
    const path = parameters.path || `webhook-${Date.now()}`;
    const authentication = parameters.authentication || 'none';
    const responseMode = parameters.responseMode || 'onReceived';
    const responseCode = parameters.responseCode || 200;
    const responseData = parameters.responseData;
    const options = parameters.options || {};

    // Create webhook node parameters
    const webhookParameters: WebhookNodeParameters = createWebhookParameters(
      path,
      httpMethod,
      authentication
    );

    // Add additional parameters
    webhookParameters.responseMode = responseMode;
    webhookParameters.responseCode = responseCode;

    if (responseData) {
      webhookParameters.responseData = responseData;
    }

    if (Object.keys(options).length > 0) {
      webhookParameters.options = options;
    }

    // Determine typeVersion - use config's defaultVersion or fall back to 1
    const typeVersion = config?.defaultVersion === 2 ? 2 : 1;

    // Create n8n webhook node
    const webhookNode: WebhookNodeConfig = {
      id,
      name: id, // Use node ID for stable references (matches legacy pattern)
      type: WEBHOOK_NODE_DEFAULTS.type,
      typeVersion,
      position: [position.x, position.y],
      webhookId: path, // Required for n8n routing
      parameters: webhookParameters,
    };

    return {
      nodes: [webhookNode],
      internalEdges: [], // No internal edges - simple 1:1 mapping
      replacements: {}, // No replacements - simple 1:1 mapping
      metadata: {
        transformationName: this.name,
        originalNodeId: id,
        originalNodeType: node.type,
        nodesCreated: 1,
        custom: {
          nativeN8nNode: true,
          webhookPath: path,
          httpMethod,
        },
      },
    };
  }
}

export const nativeWebhook = new NativeWebhookTransformation();
