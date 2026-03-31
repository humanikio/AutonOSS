/**
 * Webhook Trigger Transformation
 *
 * Converts ReactFlow trigger nodes (subscription triggers) to n8n webhook nodes.
 *
 * This transformation is applied when a node has:
 * - _pulseline.isTrigger = true
 *
 * Subscription triggers (SMS received, phone call completed, event lifecycle milestones)
 * are converted to n8n webhook nodes that listen for incoming HTTP requests.
 *
 * Flow: [Webhook Trigger] → [Next Node]
 */

import type {
  Transformation,
  TransformationResult,
  TransformationContext,
  ReactFlowNode,
} from '../types/transformationMethodTypes';
import type { INodeTypeDescription } from '../../../../workflows/services/nodeRegistry/types';

import {
  WebhookNodeConfig,
  WEBHOOK_NODE_DEFAULTS,
  createWebhookParameters,
} from '../n8n/nodeSchemas/Webhook.schema';

export class WebhookTriggerTransformation implements Transformation {
  readonly name = 'trigger_webhook';
  readonly priority = 100; // High priority

  /**
   * Check if this transformation should be applied to a trigger node
   */
  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    // Must have isTrigger flag
    if (!config?._pulseline?.isTrigger) {
      return false;
    }

    return true;
  }

  /**
   * Transform the trigger node into an n8n webhook node
   */
  transform(
    node: ReactFlowNode,
    config: INodeTypeDescription,
    context: TransformationContext
  ): TransformationResult {
    const { id, position, data } = node;
    const { parameters = {} } = data;

    console.log(`🔄 Converting subscription trigger to webhook node`);

    // Extract webhook parameters (or use defaults)
    const httpMethod = parameters.httpMethod || 'POST';
    const path = parameters.path || `webhook-${Date.now()}`;
    const authentication = parameters.authentication || 'none';
    const responseMode = parameters.responseMode || 'onReceived';
    const options = parameters.options || {};

    // Log trigger type for debugging
    if (config._pulseline?.triggerType) {
      console.log(`   📡 Subscription trigger type: ${config._pulseline.triggerType}`);
    }

    // ========================================================================
    // Create n8n webhook node
    // ========================================================================
    const webhookNode: WebhookNodeConfig = {
      id,
      name: id,
      type: WEBHOOK_NODE_DEFAULTS.type,
      typeVersion: WEBHOOK_NODE_DEFAULTS.typeVersion,
      position: [position.x, position.y],
      webhookId: path, // n8n uses webhookId for routing
      parameters: createWebhookParameters(path, httpMethod, authentication),
    };

    // Add response mode and options to parameters
    webhookNode.parameters.responseMode = responseMode;
    webhookNode.parameters.options = options;

    console.log(`   🔗 Converted to webhook node with webhookId: ${path}`);

    // ========================================================================
    // Return transformation result
    // ========================================================================
    return {
      nodes: [webhookNode],

      // No internal edges - trigger is first node
      internalEdges: [],

      // No replacements - simple 1:1 mapping (node ID stays the same)
      replacements: {},

      // Metadata
      metadata: {
        transformationName: this.name,
        originalNodeId: id,
        originalNodeType: node.type,
        nodesCreated: 1,
        custom: {
          triggerType: config._pulseline?.triggerType,
          webhookPath: path,
          httpMethod,
        },
      },
    };
  }

  /**
   * Optional validation hook for debugging
   */
  validate(result: TransformationResult): void {
    // Validate we created exactly 1 node
    if (result.nodes.length !== 1) {
      throw new Error(
        `WebhookTrigger should create 1 node, got ${result.nodes.length}`
      );
    }

    // Validate no internal edges (trigger is first node)
    if (result.internalEdges.length !== 0) {
      throw new Error(
        `WebhookTrigger should create 0 internal edges, got ${result.internalEdges.length}`
      );
    }

    // Validate node type
    const [webhookNode] = result.nodes;

    if (webhookNode.type !== 'n8n-nodes-base.webhook') {
      throw new Error(`Node should be Webhook node, got ${webhookNode.type}`);
    }

    // Validate webhookId exists
    if (!webhookNode.webhookId) {
      throw new Error('Webhook node must have webhookId');
    }
  }
}

// Export singleton instance
export const triggerWebhook = new WebhookTriggerTransformation();
