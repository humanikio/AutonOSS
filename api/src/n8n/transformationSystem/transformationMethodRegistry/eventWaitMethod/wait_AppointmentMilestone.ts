/**
 * Wait Appointment Milestone Transformation
 *
 * Transforms a Wait node with appointmentMilestone mode into a Set � HTTP � Wait chain.
 *
 * This transformation is applied when a wait node has:
 * - _pulseline.webhookWait = true
 * - resume = 'appointmentMilestone'
 *
 * The transformation injects three nodes:
 * 1. Set node - Captures execution metadata (executionId, resumeUrl, milestone, eventId)
 * 2. HTTP node - POSTs metadata to our API for subscription creation
 * 3. Wait node - Webhook wait that pauses until the milestone triggers
 *
 * Flow: [Previous Node] � Set � HTTP � Wait � [Next Node]
 */

import type {
  Transformation,
  TransformationResult,
  TransformationContext,
  ReactFlowNode,
} from '../types/transformationMethodTypes';
import type { INodeTypeDescription } from '../../../../workflows/services/nodeRegistry/types';

import {
  SetNodeConfig,
  SET_NODE_DEFAULTS,
  createSetAssignment,
} from '../n8n/nodeSchemas/Set.schema';

import {
  HttpRequestNodeConfig,
  HTTP_REQUEST_DEFAULTS,
} from '../n8n/nodeSchemas/HttpRequest.schema';

import {
  WaitNodeConfig,
  WAIT_NODE_DEFAULTS,
  createWebhookWaitParameters,
} from '../n8n/nodeSchemas/Wait.schema';

import { createChainReplacement } from '../utils/replacementHelpers';

export class WaitAppointmentMilestoneTransformation implements Transformation {
  readonly name = 'wait_appointmentMilestone';
  readonly priority = 100; // High priority - should run before default wait transformation

  /**
   * Check if this transformation should be applied to a wait node
   */
  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    // Must be a wait node
    if (node.type !== 'wait' && node.data?.config?.name !== 'wait') {
      return false;
    }

    // Must have webhookWait flag
    if (!config?._pulseline?.webhookWait) {
      return false;
    }

    // Must have appointmentMilestone resume mode
    const resumeMode = node.data?.parameters?.resume;
    if (resumeMode !== 'appointmentMilestone') {
      return false;
    }

    return true;
  }

  /**
   * Transform the wait node into Set � HTTP � Wait chain
   */
  transform(
    node: ReactFlowNode,
    config: INodeTypeDescription,
    context: TransformationContext
  ): TransformationResult {
    const { id, position, data } = node;
    const { parameters = {} } = data;

    // Extract appointment milestone configuration
    const milestone = parameters.milestone || '1_hour_before';
    const eventIdField = parameters.eventIdField || '={{ $json.eventId }}';

    // Generate IDs for injected nodes
    const setNodeId = `set_${id}`;
    const httpNodeId = `http_${id}`;
    const waitNodeId = `wait_${id}`;

    // Get API configuration
    const API_BASE_URL = process.env.API_BASE_URL || 'https://api.pulseline.io';
    const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678';
    const apiKey = context.apiKey; // Get tenant API key from context

    // ========================================================================
    // NODE 1: Set node to capture execution metadata
    // ========================================================================
    const setNode: SetNodeConfig = {
      id: setNodeId,
      name: setNodeId, // Use node ID for stable references (matches legacy pattern)
      type: SET_NODE_DEFAULTS.type,
      typeVersion: SET_NODE_DEFAULTS.typeVersion,
      position: [position.x, position.y],
      parameters: {
        mode: SET_NODE_DEFAULTS.mode,
        duplicateItem: SET_NODE_DEFAULTS.duplicateItem,
        assignments: {
          assignments: [
            createSetAssignment('executionId', 'executionId', '={{ $execution.id }}'),
            createSetAssignment('resumeUrl', 'resumeUrl', `={{ "${N8N_API_URL}/webhook-waiting/" + $execution.id }}`),
            createSetAssignment('workflowId', 'workflowId', '={{ $workflow.id }}'),
            createSetAssignment('milestone', 'milestone', milestone),
            createSetAssignment('eventId', 'eventId', eventIdField),
            createSetAssignment('nodeId', 'nodeId', id),
          ],
        },
        options: {},
      },
    };

    // ========================================================================
    // NODE 2: HTTP Request node to register wait execution with our API
    // ========================================================================
    // Build headers using OLD CONVERTER PATTERN (jsonHeaders with stringified object)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key in Authorization header (required by authenticateEither middleware)
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      headers['Authorization'] = 'Bearer TENANT_API_KEY_PLACEHOLDER';
    }

    const httpNode: HttpRequestNodeConfig = {
      id: httpNodeId,
      name: httpNodeId, // Use node ID for stable references (matches legacy pattern)
      type: HTTP_REQUEST_DEFAULTS.type,
      typeVersion: HTTP_REQUEST_DEFAULTS.typeVersion,
      position: [position.x + 250, position.y], // 250px right of Set
      parameters: {
        url: `${API_BASE_URL}/api/inbound-n8n/execution-hooks`,
        authentication: 'none', // We handle auth via headers
        method: 'POST',
        sendHeaders: true,
        specifyHeaders: 'json', // Use JSON format like old system
        jsonHeaders: JSON.stringify(headers), // Stringify headers like old system
        sendBody: true,
        contentType: 'json',
        specifyBody: 'json',
        jsonBody: '={{ $json }}', // Forward all fields from Set node
        responseFormat: HTTP_REQUEST_DEFAULTS.responseFormat,
        options: {
          timeout: 10000,
          response: {
            response: {
              neverError: true, // Don't fail workflow if registration fails
            },
          },
        },
      },
    };

    // ========================================================================
    // NODE 3: Wait node (webhook mode) to pause until milestone triggers
    // ========================================================================
    const webhookPath = `wait-${waitNodeId}`;

    const waitNode: WaitNodeConfig = {
      id: waitNodeId,
      name: waitNodeId,
      type: WAIT_NODE_DEFAULTS.type,
      typeVersion: WAIT_NODE_DEFAULTS.typeVersion,
      position: [position.x + 500, position.y], // 500px right of Set (250px right of HTTP)
      webhookId: webhookPath,
      parameters: createWebhookWaitParameters(webhookPath, 'POST'),
    };

    // ========================================================================
    // Return transformation result
    // ========================================================================
    return {
      nodes: [setNode, httpNode, waitNode],

      // Internal edges: Set � HTTP � Wait
      internalEdges: [
        {
          from: setNodeId,
          to: httpNodeId,
        },
        {
          from: httpNodeId,
          to: waitNodeId,
        },
      ],

      // Replace original wait node with the chain
      // Use helper to create replacement mapping: edges targeting 'id' connect to 'setNodeId',
      // edges sourcing from 'id' connect from 'waitNodeId'
      replacements: createChainReplacement(id, setNodeId, waitNodeId),

      // Metadata
      metadata: {
        transformationName: this.name,
        originalNodeId: id,
        originalNodeType: node.type,
        nodesCreated: 3,
        custom: {
          milestone,
          eventIdField,
          webhookPath,
        },
      },
    };
  }

  /**
   * Optional validation hook for debugging
   */
  validate(result: TransformationResult): void {
    // Validate we created exactly 3 nodes
    if (result.nodes.length !== 3) {
      throw new Error(
        `WaitAppointmentMilestone should create 3 nodes, got ${result.nodes.length}`
      );
    }

    // Validate we have exactly 2 internal edges (Set � HTTP, HTTP � Wait)
    if (result.internalEdges.length !== 2) {
      throw new Error(
        `WaitAppointmentMilestone should create 2 internal edges, got ${result.internalEdges.length}`
      );
    }

    // Validate node types
    const [setNode, httpNode, waitNode] = result.nodes;

    if (setNode.type !== 'n8n-nodes-base.set') {
      throw new Error(`First node should be Set node, got ${setNode.type}`);
    }

    if (httpNode.type !== 'n8n-nodes-base.httpRequest') {
      throw new Error(`Second node should be HTTP Request node, got ${httpNode.type}`);
    }

    if (waitNode.type !== 'n8n-nodes-base.wait') {
      throw new Error(`Third node should be Wait node, got ${waitNode.type}`);
    }

    // Validate replacements exist
    if (!result.replacements || Object.keys(result.replacements).length === 0) {
      throw new Error('WaitAppointmentMilestone must provide replacements for edge rewiring');
    }
  }
}

// Export singleton instance
export const waitAppointmentMilestone = new WaitAppointmentMilestoneTransformation();
