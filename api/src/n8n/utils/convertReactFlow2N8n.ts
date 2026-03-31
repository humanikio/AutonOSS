import { WorkflowData } from '../services/types';
import { NodeRegistry } from '../../workflows/services/nodeRegistry';
import { IConditionalOutput, INodeTypeDescription } from '../../workflows/services/nodeRegistry/types';
import { readEmailTemplate } from '../../creativeHub/emailTemplates/services/emailTemplateManager';

/**
 * ReactFlow workflow format (from frontend)
 */
export interface ReactFlowWorkflow {
  name: string;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  status?: string;
}

export interface ReactFlowNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
    nodeName: string;
    parameters?: Record<string, any>;
    iconName?: string;
  };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

/**
 * Converts ReactFlow workflow format to n8n workflow format
 *
 * @param reactFlowWorkflow - Workflow in ReactFlow format
 * @param apiKey - Optional API key for Pulseline custom nodes (format: accessKeyId.apiSecret)
 * @returns Workflow in n8n API format
 */
export const convertReactFlowToN8n = async (
  reactFlowWorkflow: ReactFlowWorkflow,
  apiKey?: string
): Promise<WorkflowData> => {
  const { name, nodes: reactFlowNodes, edges: reactFlowEdges } = reactFlowWorkflow;

  console.log(`📊 ReactFlow workflow conversion starting:`);
  console.log(`   - Nodes: ${reactFlowNodes.length}`);
  console.log(`   - Edges: ${reactFlowEdges.length}`);
  console.log(`   - Edge details:`);
  reactFlowEdges.forEach(edge => {
    console.log(`      ${edge.source} → ${edge.target} (${edge.sourceHandle || 'default'} → ${edge.targetHandle || 'default'})`);
  });

  const n8nNodes: any[] = [];
  const nodesRequiringIf: Array<{ httpNode: any; config: INodeTypeDescription; originalNode: ReactFlowNode }> = [];
  const waitNodeInjections: Array<{ original: string; set: string; http: string; wait: string }> = [];

  // Convert nodes - with special handling for Pulseline custom nodes
  for (const node of reactFlowNodes) {
    const { id, position, data } = node;
    const { label, nodeName, parameters = {} } = data;

    // Check if this is a Pulseline custom node
    const nodeConfig = NodeRegistry.getNodeConfig(nodeName);

    // Handle subscription trigger nodes (convert to webhook)
    if (nodeConfig?._pulseline?.isTrigger) {
      console.log(`🔄 Converting subscription trigger "${nodeName}" to webhook node`);
      const webhookNode = convertTriggerToWebhookNode(node, nodeConfig);
      n8nNodes.push(webhookNode);
      continue;
    }

    // Handle webhook wait nodes (wait nodes with webhookWait flag)
    if (nodeConfig?._pulseline?.webhookWait && nodeName === 'wait') {
      console.log(`🔄 Converting wait node "${nodeName}" with webhookWait - injecting Set + HTTP + Wait`);

      // Extract wait node config
      const milestone = parameters.milestone || '1_hour_before';
      const eventIdField = parameters.eventIdField || '={{ $json.eventId }}';

      // Generate IDs for injected nodes
      const setNodeId = `set_${node.id}`;
      const httpNodeId = `http_${node.id}`;
      const waitNodeId = `wait_${node.id}`;

      // INJECT 1: Set node to capture execution variables
      const setNode = createSetNodeForWait(node, setNodeId, milestone, eventIdField);
      n8nNodes.push(setNode);
      console.log(`   📋 Injected Set node: ${setNodeId}`);

      // INJECT 2: HTTP Request node to POST to our API
      const httpNode = createHttpNodeForWait(node, httpNodeId, apiKey);
      n8nNodes.push(httpNode);
      console.log(`   📡 Injected HTTP Request node: ${httpNodeId}`);

      // INJECT 3: Wait node (webhook mode) with NEW unique ID
      const waitNode = convertWaitNodeToWebhookWait(node, nodeConfig, waitNodeId);
      n8nNodes.push(waitNode);
      console.log(`   ⏸️  Injected Wait node: ${waitNode.id}`);

      // Track for edge rewiring
      waitNodeInjections.push({
        original: node.id,
        set: setNodeId,
        http: httpNodeId,
        wait: waitNode.id
      });

      continue;
    }

    // Handle adapter nodes (convert to HTTP Request)
    if (nodeConfig?._pulseline?.isAdapter) {
      console.log(`🔄 Converting adapter node "${nodeName}" (type: ${nodeConfig._pulseline.adapterType}) to HTTP Request node`);
      const httpNode = convertAdapterToHttpRequestNode(node, nodeConfig, apiKey);
      n8nNodes.push(httpNode);
      continue;
    }

    // Handle custom action nodes (convert to HTTP Request)
    if (nodeConfig?._pulseline?.isCustomNode) {
      // Convert Pulseline node to HTTP Request node
      console.log(`🔄 Converting Pulseline node "${nodeName}" to HTTP Request node`);
      const httpNode = await convertPulselineNodeToHttpRequestNode(node, nodeConfig, apiKey);
      n8nNodes.push(httpNode);

      // Check if this node needs conditional output
      if (nodeConfig._pulseline.conditionalOutput?.enabled) {
        console.log(`   🔀 Node requires conditional output - will inject IF node`);
        nodesRequiringIf.push({ httpNode, config: nodeConfig, originalNode: node });
      }
      continue;
    }

    // Standard n8n node conversion
    let nodeParameters = parameters;

    // Special handling for webhook nodes - ensure required parameters are present
    // NOTE: This is a FALLBACK - parameters should be auto-generated on frontend node creation
    if (nodeName === 'webhook' && Object.keys(parameters).length === 0) {
      console.warn(`⚠️  Webhook node has no parameters (should be generated on frontend), using fallback`);
      nodeParameters = {
        httpMethod: 'POST',
        path: `webhook-${Date.now()}`, // Fallback: Generate a unique path
        authentication: 'none',
        responseMode: 'onReceived', // Respond immediately (fire-and-forget)
        options: {}
      };
    }

    // Special handling for IF nodes - convert simplified params to n8n filter format
    if (nodeName === 'if' && parameters.field) {
      const { field, conditionType, booleanOperation, stringOperation, numberOperation, compareValue } = parameters;

      // Determine operation type and value based on condition type
      let operation: string;
      let opType: string;
      let rightValue: any;
      let singleValue = false;

      if (conditionType === 'boolean') {
        opType = 'boolean';
        operation = booleanOperation === 'true' ? 'true' : 'false';
        rightValue = booleanOperation === 'true';
        singleValue = true;
      } else if (conditionType === 'string') {
        opType = 'string';
        operation = stringOperation;
        rightValue = compareValue || '';
        singleValue = ['isEmpty', 'isNotEmpty'].includes(stringOperation);
      } else if (conditionType === 'number') {
        opType = 'number';
        const operationMap: Record<string, string> = {
          equals: 'equals',
          notEquals: 'notEquals',
          greaterThan: 'gt',
          lessThan: 'lt',
          greaterOrEqual: 'gte',
          lessOrEqual: 'lte',
        };
        operation = operationMap[numberOperation] || 'equals';
        rightValue = compareValue || 0;
      } else if (conditionType === 'tagCheck') {
        // Tag check handling - use STRING operations since n8n treats the tags array as a string
        const { tagOperation, tagId } = parameters;

        console.log(`   🏷️  Tag check parameters:`, { tagOperation, tagId, allParameters: parameters });

        if (tagOperation === 'hasTag' || tagOperation === 'notHasTag') {
          // Validate that tagId is provided and not the string "undefined"
          if (!tagId || tagId === 'undefined' || tagId === undefined) {
            console.warn(`   ⚠️  WARNING: No tag selected for ${tagOperation} operation!`);
            console.warn(`   ⚠️  User must select a tag from the dropdown for this condition to work.`);
          }
        }

        if (tagOperation === 'hasTag') {
          opType = 'string';
          operation = 'contains';
          rightValue = tagId;
          singleValue = false;
        } else if (tagOperation === 'notHasTag') {
          opType = 'string';
          operation = 'notContains';
          rightValue = tagId;
          singleValue = false;
        } else if (tagOperation === 'hasAnyTags') {
          opType = 'string';
          operation = 'isNotEmpty';
          rightValue = undefined;
          singleValue = true;
        } else if (tagOperation === 'hasNoTags') {
          opType = 'string';
          operation = 'isEmpty';
          rightValue = undefined;
          singleValue = true;
        } else {
          // Fallback
          opType = 'string';
          operation = 'isNotEmpty';
          rightValue = undefined;
          singleValue = true;
        }

        console.log(`   🏷️  Tag check converted: operation=${operation}, rightValue=${rightValue}, field=${field}`);
      } else {
        // Default fallback
        opType = 'boolean';
        operation = 'true';
        rightValue = true;
        singleValue = true;
      }

      // Build n8n filter format
      nodeParameters = {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict'
          },
          conditions: [
            {
              id: '1',
              leftValue: field,
              rightValue: singleValue ? undefined : rightValue,
              operator: {
                type: opType,
                operation: operation,
                ...(singleValue && { singleValue: true })
              }
            }
          ],
          combinator: 'and'
        },
        options: {}
      };

      console.log(`✅ Converted IF node: ${field} ${operation} ${rightValue !== undefined ? rightValue : ''}`);
      console.log(`   📋 Full IF condition:`, JSON.stringify(nodeParameters.conditions.conditions[0], null, 2));
    }

    // Build the base node
    const n8nNode: any = {
      id,
      name: id, // Use node ID as name for stable references (immune to label changes)
      type: `n8n-nodes-base.${nodeName}`, // Convert to n8n node type format
      typeVersion: nodeName === 'if' ? 2 : 1, // IF node requires version 2, others default to 1
      position: [position.x, position.y] as [number, number], // Convert {x,y} to [x,y]
      parameters: nodeParameters, // Parameters are already in n8n format from NodeConfigPanel
    };

    // Add webhookId for webhook nodes (required for production webhook registration)
    if (nodeName === 'webhook' && nodeParameters.path) {
      n8nNode.webhookId = nodeParameters.path;
      console.log(`🔗 Added webhookId: ${nodeParameters.path}`);
    }

    n8nNodes.push(n8nNode);
  }

  // Inject IF nodes for conditional outputs
  nodesRequiringIf.forEach(({ httpNode, config, originalNode }) => {
    const ifNode = generateIfNodeForConditionalOutput(
      httpNode,
      config._pulseline!.conditionalOutput!,
      originalNode
    );
    n8nNodes.push(ifNode);
    console.log(`   ✅ Injected IF node: "${ifNode.name}"`);
  });

  // Convert edges to n8n connections format with conditional routing support
  const connections = convertEdgesToConnectionsWithConditionalRouting(
    reactFlowNodes,
    reactFlowEdges,
    nodesRequiringIf,
    waitNodeInjections
  );

  return {
    name,
    nodes: n8nNodes,
    connections,
    settings: {}, // Empty settings object as required by n8n
  };
};

/**
 * Generates an n8n IF node for conditional output routing
 *
 * @param httpNode - The HTTP Request node that this IF node follows
 * @param conditionalConfig - Conditional output configuration
 * @param originalNode - Original ReactFlow node for positioning
 * @returns n8n IF node configuration
 */
function generateIfNodeForConditionalOutput(
  httpNode: any,
  conditionalConfig: IConditionalOutput,
  originalNode: ReactFlowNode
): any {
  const ifNodeId = `${httpNode.id}_if`;
  const ifNodeName = ifNodeId; // Use pure ID for stable references

  console.log(`   🔧 Generating IF node to check field: "${conditionalConfig.field}"`);
  console.log(`   📊 True branch: "${conditionalConfig.trueLabel || 'True'}"`);
  console.log(`   📊 False branch: "${conditionalConfig.falseLabel || 'False'}"`);

  return {
    id: ifNodeId,
    name: ifNodeName, // Use ID as name for stable references
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [
      originalNode.position.x + 300,  // Position to the right of HTTP node
      originalNode.position.y
    ] as [number, number],
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict'
        },
        conditions: [
          {
            id: '1',
            leftValue: `={{$json.${conditionalConfig.field}}}`,
            rightValue: true,
            operator: {
              type: 'boolean',
              operation: 'true',
              singleValue: true
            }
          }
        ],
        combinator: 'and'
      },
      options: {}
    }
  };
}

/**
 * Converts a subscription trigger node to an n8n webhook node
 *
 * This function handles subscription triggers (smsReceivedTrigger, phoneCallCompletedTrigger)
 * and converts them to standard n8n webhook nodes. The subscription system will post events
 * to the generated webhook URL when they occur.
 *
 * @param node - The ReactFlow node to convert
 * @param nodeConfig - Node configuration from registry
 * @returns n8n webhook node configuration
 */
function convertTriggerToWebhookNode(
  node: ReactFlowNode,
  nodeConfig: INodeTypeDescription
): any {
  const { id, position, data } = node;
  const { parameters = {} } = data;

  // Generate webhook parameters (or use existing from parameters)
  const webhookParams = {
    httpMethod: parameters.httpMethod || 'POST',
    path: parameters.path || `webhook-${Date.now()}`,
    authentication: parameters.authentication || 'none',
    responseMode: parameters.responseMode || 'onReceived',
    options: parameters.options || {}
  };

  const n8nNode = {
    id,
    name: id,
    type: 'n8n-nodes-base.webhook',
    typeVersion: 1,
    position: [position.x, position.y] as [number, number],
    parameters: webhookParams,
    webhookId: webhookParams.path,
  };

  // Log trigger type for debugging (metadata is not supported by n8n API)
  if (nodeConfig._pulseline?.triggerType) {
    console.log(`   📡 Subscription trigger type: ${nodeConfig._pulseline.triggerType}`);
  }

  console.log(`   🔗 Converted to webhook node with webhookId: ${webhookParams.path}`);

  return n8nNode;
}

/**
 * Converts a wait node with webhookWait flag to n8n wait node (webhook mode)
 *
 * This function handles wait nodes configured for appointment milestones.
 * When resume mode is 'appointmentMilestone', the node is converted to an n8n
 * wait node with webhook resume mode. The workflow will pause until a milestone
 * event occurs and posts to the dynamically generated resumeUrl.
 *
 * @param node - The ReactFlow wait node to convert
 * @param nodeConfig - Node configuration from registry
 * @param waitNodeId - Unique ID for the wait node (to avoid conflicts with original node ID)
 * @returns n8n wait node configuration with webhook resume
 */
function convertWaitNodeToWebhookWait(
  node: ReactFlowNode,
  nodeConfig: INodeTypeDescription,
  waitNodeId: string
): any {
  const { position, data } = node;
  const { label, parameters = {} } = data;

  // Extract appointment milestone configuration
  const resume = parameters.resume || 'appointmentMilestone';
  const milestone = parameters.milestone || '1_hour_before';
  const eventIdField = parameters.eventIdField || '={{ $json.eventId }}';

  // Only convert if resume mode is appointmentMilestone
  if (resume !== 'appointmentMilestone') {
    console.warn(`   ⚠️  Wait node has webhookWait flag but resume is not 'appointmentMilestone' (got: ${resume})`);
  }

  // Generate webhook path for wait node
  const webhookPath = `wait-${waitNodeId}`;

  const n8nNode = {
    id: waitNodeId,
    name: waitNodeId,
    type: 'n8n-nodes-base.wait',
    typeVersion: 1.1,
    position: [position.x + 500, position.y] as [number, number], // Position 500px right of Set (250px right of HTTP)
    webhookId: webhookPath, // n8n generates unique webhook for this wait node
    parameters: {
      resume: 'webhook', // KEY: Sets wait mode to webhook
      path: webhookPath, // Webhook path for resume
      httpMethod: 'POST', // Resume webhook accepts POST
      options: {
        // Store context for subscription creation
        // These don't affect n8n execution but are useful metadata
      }
    }
  };

  console.log(`   ⏸️  Converted to wait node (webhook mode) with webhookId: ${webhookPath}`);
  console.log(`   📅 Milestone: ${milestone}, EventID field: ${eventIdField}`);

  return n8nNode;
}

/**
 * Creates a Set node that captures execution metadata for wait nodes
 *
 * This node captures runtime variables from n8n ($execution.id, $execution.resumeUrl, etc.)
 * and passes them to the HTTP node for posting to our API.
 *
 * @param originalNode - The original wait ReactFlow node
 * @param setNodeId - Generated ID for the Set node
 * @param milestone - The milestone value (e.g., '1_hour_before')
 * @param eventIdField - Expression to extract eventId (e.g., '={{ $json.eventId }}')
 * @returns n8n Set node configuration
 */
function createSetNodeForWait(
  originalNode: ReactFlowNode,
  setNodeId: string,
  milestone: string,
  eventIdField: string
): any {
  const position = originalNode.position || { x: 0, y: 0 };

  return {
    id: setNodeId,
    name: `Capture Wait Metadata`,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [position.x, position.y], // Same position as original wait node (will be first in chain)
    parameters: {
      mode: 'manual',
      duplicateItem: false,
      assignments: {
        assignments: [
          {
            id: 'executionId',
            name: 'executionId',
            value: '={{ $execution.id }}',
            type: 'string'
          },
          {
            id: 'resumeUrl',
            name: 'resumeUrl',
            value: '={{ $execution.resumeUrl }}',
            type: 'string'
          },
          {
            id: 'workflowId',
            name: 'workflowId',
            value: '={{ $workflow.id }}',
            type: 'string'
          },
          {
            id: 'milestone',
            name: 'milestone',
            value: milestone,
            type: 'string'
          },
          {
            id: 'eventId',
            name: 'eventId',
            value: eventIdField,
            type: 'string'
          }
        ]
      },
      options: {}
    }
  };
}

/**
 * Creates an HTTP Request node that posts execution metadata to our API
 *
 * This node receives the captured metadata from the Set node and POSTs it to
 * /api/inbound-n8n/execution-hooks for storage in Firestore.
 *
 * @param originalNode - The original wait ReactFlow node
 * @param httpNodeId - Generated ID for the HTTP node
 * @param apiKey - API key for authentication
 * @returns n8n HTTP Request node configuration
 */
function createHttpNodeForWait(
  originalNode: ReactFlowNode,
  httpNodeId: string,
  apiKey?: string
): any {
  const position = originalNode.position || { x: 0, y: 0 };
  const API_BASE_URL = process.env.API_BASE_URL || 'https://api.pulseline.io';

  return {
    id: httpNodeId,
    name: `Register Wait Execution`,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [position.x + 250, position.y], // Position 250px right of Set node
    parameters: {
      url: `${API_BASE_URL}/api/inbound-n8n/execution-hooks`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      method: 'POST',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ $json }}', // Forward all fields from Set node
      options: {
        timeout: 10000,
        response: {
          response: {
            neverError: true // Don't fail workflow if registration fails
          }
        }
      },
      headerParameters: {
        parameters: [
          {
            name: 'Content-Type',
            value: 'application/json'
          },
          ...(apiKey ? [{
            name: 'X-API-Key',
            value: apiKey
          }] : [])
        ]
      }
    }
  };
}

/**
 * Converts an adapter node to an n8n HTTP Request node
 *
 * Adapter nodes (contactAdapter, etc.) are special nodes that fetch complete entity data
 * from the Pulseline API. They're invisible in the frontend but crucial for field resolution.
 *
 * @param node - The ReactFlow adapter node
 * @param config - Node configuration from registry
 * @param apiKey - Optional API key to inject
 * @returns n8n HTTP Request node configuration
 */
function convertAdapterToHttpRequestNode(
  node: ReactFlowNode,
  config: any,
  apiKey?: string
): any {
  const { id, position, data } = node;
  const { parameters = {} } = data;
  const { _pulseline } = config;

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

  console.log(`   🔧 Adapter type: ${_pulseline.adapterType}`);
  console.log(`   📍 Contact ID source: ${parameters.contactId}`);

  // Extract the contactId expression (already in n8n format)
  const contactIdExpression = parameters.contactId || '={{$json.body.contactId}}';

  // Build the API endpoint URL using the same pattern as convertPulselineNodeToHttpRequestNode
  // This ensures proper expression concatenation instead of string literal replacement
  let endpoint = _pulseline.apiEndpoint;
  const urlParts: string[] = [];

  // Split endpoint into static parts and dynamic parts
  let lastIndex = 0;
  const paramRegex = /\{\{\$parameter\["([^"]+)"\]\}\}/g;
  let match;

  while ((match = paramRegex.exec(endpoint)) !== null) {
    // Add static part before this match
    if (match.index > lastIndex) {
      const staticPart = endpoint.substring(lastIndex, match.index);
      urlParts.push(`'${staticPart}'`);
    }

    // Add dynamic part - unwrap the n8n expression
    const paramName = match[1];
    const userValue = parameters[paramName]; // e.g., "={{$json.body.contactId}}"

    if (userValue !== undefined && userValue !== '') {
      // Remove n8n expression wrapper: ={{ ... }} or {{ ... }}
      let expr = userValue.trim();

      if (expr.startsWith('={{')) {
        expr = expr.slice(3, -2).trim(); // Remove ={{ and }}
      } else if (expr.startsWith('{{')) {
        expr = expr.slice(2, -2).trim(); // Remove {{ and }}
      }

      // Wrap expression in parentheses if it contains operators (||, &&, etc.)
      // to ensure correct precedence when concatenating with +
      if (expr.includes('||') || expr.includes('&&') || expr.includes('?')) {
        expr = `(${expr})`;
      }

      // Add the unwrapped expression (no encoding needed for contactId)
      urlParts.push(expr);
    } else {
      // Fallback to $json.paramName
      urlParts.push(`$json.${paramName}`);
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

  // Build full URL using n8n expression syntax with + concatenation
  const urlExpression = `={{ '${backendUrl}' + ${urlParts.join(' + ')} }}`;

  console.log(`   🌐 URL: ${urlExpression}`);

  // We need to add a Code node AFTER the adapter to flatten the response
  // n8n HTTP Request node doesn't support postExecute in the way we need
  // So we'll just return the HTTP node, and inject a Code node after it in the main conversion loop

  const n8nNode: any = {
    id,
    name: id,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4,
    position: [position.x, position.y] as [number, number],
    parameters: {
      method: _pulseline.httpMethod,
      url: urlExpression,
      authentication: 'none',
      sendHeaders: true,
      specifyHeaders: 'json',
      jsonHeaders: JSON.stringify({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey || 'PLACEHOLDER_API_KEY'}`,
      }),
      options: {
        response: {
          response: {
            neverError: true, // Don't throw errors on HTTP error status codes
          },
        },
      },
    },
  };

  // Add continueOnFail setting if specified in config
  // This allows workflows to continue even if adapter fails (e.g., contact not found)
  if (_pulseline.continueOnFail === true) {
    n8nNode.continueOnFail = true;
    console.log(`   🔄 continueOnFail enabled - workflow will continue if contact not found`);
  }

  console.log(`   ✅ Converted adapter to HTTP Request node`);

  return n8nNode;
}

/**
 * Converts a Pulseline custom node to an n8n HTTP Request node
 *
 * This function takes a Pulseline node (e.g., pulselineCreateContact) and converts it
 * to an HTTP Request node that calls the Pulseline API with the appropriate parameters.
 * The API key contains the tenant scope - middleware extracts tenantId from the key.
 *
 * @param node - The ReactFlow node to convert
 * @param config - The node configuration from the registry
 * @param apiKey - Optional API key to inject (format: accessKeyId.apiSecret)
 * @returns An n8n HTTP Request node configuration
 */
async function convertPulselineNodeToHttpRequestNode(
  node: ReactFlowNode,
  config: any,
  apiKey?: string
): Promise<any> {
  const { id, position, data } = node;
  const { label, parameters = {} } = data;
  const { _pulseline, properties } = config;

  // Get the backend URL from environment
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

  console.log(`   📍 Converting to HTTP Request node`);
  console.log(`   🔧 Method: ${_pulseline.httpMethod}`);
  console.log(`   📦 User Parameters:`, parameters);

  if (apiKey) {
    console.log(`   🔑 Injecting API key (${apiKey.substring(0, 15)}...)`);
  } else {
    console.log(`   ⚠️  No API key provided - using placeholder`);
  }

  // Build endpoint with dynamic replacements using n8n expression syntax
  let endpoint = _pulseline.apiEndpoint;
  const urlParts: string[] = [];
  let hasUrlExpressions = false;

  // Remove {{$credentials.tenantId}} from endpoints - tenantId is derived from API key on backend
  endpoint = endpoint.replace(/\/\{\{\$credentials\.tenantId\}\}/g, '');

  // Split endpoint into static parts and dynamic parts
  let lastIndex = 0;
  const paramRegex = /\{\{\$parameter\["([^"]+)"\]\}\}/g;
  let match;

  while ((match = paramRegex.exec(endpoint)) !== null) {
    hasUrlExpressions = true;

    // Add static part before this match
    if (match.index > lastIndex) {
      const staticPart = endpoint.substring(lastIndex, match.index);
      urlParts.push(`'${staticPart}'`);
    }

    // Add dynamic part
    const paramName = match[1];
    const userValue = parameters[paramName];

    if (userValue !== undefined && userValue !== '') {
      // Check if user provided an expression like {{$json.contactId}} or ={{ ... }}
      if (typeof userValue === 'string' && userValue.includes('{{') && userValue.includes('}}')) {
        // Remove n8n expression wrapper: ={{ ... }} or {{ ... }}
        let expr = userValue.trim();

        // Remove outer ={{ }} or {{ }}
        if (expr.startsWith('={{')) {
          expr = expr.slice(3, -2).trim(); // Remove ={{ and }}
        } else if (expr.startsWith('{{')) {
          expr = expr.slice(2, -2).trim(); // Remove {{ and }}
        }

        // Use encodeURIComponent for safety
        urlParts.push(`encodeURIComponent(${expr})`);
      } else {
        // Literal value
        urlParts.push(`'${userValue}'`);
      }
    } else {
      // Default to $json.paramName with encoding
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
    // Use n8n expression syntax: ={{ 'base' + dynamic + 'path' }}
    const urlExpression = `'${backendUrl}' + ${urlParts.join(' + ')}`;
    fullUrl = `={{ ${urlExpression} }}`;
    console.log(`   🌐 Full URL (n8n expression): ${fullUrl}`);
  } else {
    // Static URL
    fullUrl = `${backendUrl}${endpoint}`;
    console.log(`   🌐 Full URL (static): ${fullUrl}`);
  }

  // Build JSON body dynamically based on user parameters
  let jsonBody = buildJsonBody(config, parameters);
  console.log(`   📦 Generated body fields:`, Object.keys(jsonBody));

  // ============================================================================
  // SPECIAL HANDLING: Trigger Workflow Node - Flexible Payload Construction
  // ============================================================================
  // This pattern is used when a node needs to:
  // 1. Allow users to map custom field names AND values (fixedCollection type)
  // 2. Support multiple payload construction modes (passthrough/json/fields)
  // 3. Convert UI field pairs into n8n expression objects
  //
  // REUSABLE PATTERN:
  // - Use fixedCollection type in node config for dynamic key-value pairs
  // - Implement mode selection for different construction methods
  // - Convert fixedCollection array → n8n expression object
  //
  // Other nodes that could use this pattern:
  // - HTTP Request (custom headers, query params)
  // - Custom API calls with dynamic payloads
  // - Any node where user defines both field names AND values
  // ============================================================================
  if (data.nodeName === 'triggerWorkflow') {
    const payloadMode = parameters.payloadMode || 'passthrough';
    console.log(`   🚀 Trigger Workflow node - payload mode: ${payloadMode}`);

    // Mode 1: Pass through all data from previous node
    if (payloadMode === 'passthrough') {
      jsonBody.payload = '={{ $json }}';
      console.log(`   📤 Payload: passing through all data`);
    }
    // Mode 2: Use raw JSON from textarea
    else if (payloadMode === 'json') {
      jsonBody.payload = parameters.payload || '={{ $json }}';
      console.log(`   📤 Payload: using raw JSON`);
    }
    // Mode 3: Convert fixedCollection field pairs → n8n expression object
    // This is the REUSABLE PATTERN for dynamic field mapping
    else if (payloadMode === 'fields') {
      jsonBody.payload = convertFixedCollectionToN8nObject(
        parameters.payloadFields?.field || [],
        'payload',
        '={{ $json }}' // Fallback if no fields
      );
      console.log(`   📤 Payload: converted fixedCollection to n8n object`);
    }

    // Clean up: Remove UI-only fields from final HTTP body
    delete jsonBody.payloadMode;
    delete jsonBody.payloadFields;
  }

  // ============================================================================
  // SPECIAL HANDLING: Send Email Node - Template Support
  // ============================================================================
  // When contentType is 'template', keep templateId so API can resolve it
  // We don't fetch template here anymore - let the API handle it
  // ============================================================================
  if (data.nodeName === 'pulselineSendEmail') {
    const contentType = parameters.contentType || 'manual';
    console.log(`   📧 Send Email node - content type: ${contentType}`);

    // Clean up: Remove UI-only contentType field
    delete jsonBody.contentType;

    // When using template mode
    if (contentType === 'template') {
      // Remove message field (not needed when using template)
      delete jsonBody.message;
      // Keep templateId - the API will use it to fetch template content
      console.log(`   📧 Using template mode - templateId will be sent to API: ${parameters.templateId}`);
    } else {
      // Manual mode - remove templateId if present
      delete jsonBody.templateId;
    }
  }

  // Use provided API key or placeholder
  const apiKeyValue = apiKey || 'TENANT_API_KEY_PLACEHOLDER';

  // Build authorization header
  const headers = {
    Authorization: `Bearer ${apiKeyValue}`,
    'Content-Type': 'application/json',
  };

  // Determine if body is needed
  const needsBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(_pulseline.httpMethod);

  // Build HTTP Request node parameters (V3/V4 format)
  const nodeParameters: any = {
    method: _pulseline.httpMethod,
    url: fullUrl,
    sendHeaders: true,
    specifyHeaders: 'json',                      // Required for V3/V4
    jsonHeaders: JSON.stringify(headers),        // Correct parameter name for V3/V4
    responseFormat: 'json',
    options: {
      timeout: 30000,
      // If continueOnFail is enabled, also set neverError to prevent HTTP errors from stopping execution
      ...((_pulseline.continueOnFail === true) && {
        response: {
          response: {
            neverError: true,
          },
        },
      }),
    },
  };

  // Add body parameters if needed
  if (needsBody) {
    nodeParameters.sendBody = true;
    nodeParameters.contentType = 'json';

    // Always use keypair mode for body parameters
    nodeParameters.specifyBody = 'keypair';

    // Convert jsonBody object to bodyParameters.parameters array format for n8n v4
    const bodyParametersArray: Array<{ name: string; value: string }> = [];

    // First, add all standard fields from jsonBody
    Object.entries(jsonBody).forEach(([name, value]) => {
      const s = String(value).trim();
      const isExpr = s.startsWith('={{') || s.startsWith('{{');
      const normalized = isExpr
        ? (s.startsWith('={{') ? s : '=' + s)   // ensure leading "="
        : s;

      bodyParametersArray.push({
        name,
        value: normalized
      });
    });

    // Second, handle contactFields fixedCollection if present in user parameters
    if (parameters.contactFields) {
      console.log(`   🔧 Flattening contactFields fixedCollection from user parameters:`, parameters.contactFields);

      const contactFieldsObj = parameters.contactFields as any;
      // contactFields structure: { field: [ { fieldName: 'x', fieldValue: 'y' }, ... ] }
      if (contactFieldsObj.field && Array.isArray(contactFieldsObj.field)) {
        contactFieldsObj.field.forEach((item: any) => {
          if (item.fieldName && item.fieldValue !== undefined) {
            // Add each custom field as individual body parameter
            const s = String(item.fieldValue).trim();
            const isExpr = s.startsWith('={{') || s.startsWith('{{');
            const normalized = isExpr
              ? (s.startsWith('={{') ? s : '=' + s)
              : s;

            bodyParametersArray.push({
              name: item.fieldName,
              value: normalized
            });
            console.log(`      ✅ Added custom field: ${item.fieldName} = ${normalized}`);
          }
        });
      }
    }

    // n8n HTTP Request v4 expects bodyParameters with parameters wrapper
    nodeParameters.bodyParameters = {
      parameters: bodyParametersArray
    };

    console.log(`   📦 Body parameters (${bodyParametersArray.length} fields):`, bodyParametersArray.map(p => `${p.name}=${p.value}`).join(', '));

  }

  console.log(`   ✅ Generated HTTP Request node`);

  // Build the node object
  const httpNode: any = {
    id,
    name: id, // Use node ID as name for stable references (immune to label changes)
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4,
    position: [position.x, position.y] as [number, number],
    parameters: nodeParameters,
  };

  // Add continueOnFail setting if specified in config
  // This allows workflows to continue even if HTTP request fails (essential for gate nodes)
  if (_pulseline.continueOnFail === true) {
    httpNode.continueOnFail = true;
    console.log(`   🔄 continueOnFail enabled - workflow will continue on errors`);
  }

  return httpNode;
}

/**
 * ============================================================================
 * REUSABLE HELPER: Convert fixedCollection to n8n Expression Object
 * ============================================================================
 * Converts an array of {name, value} field pairs into an n8n expression object.
 * This is used when users can define BOTH field names AND values dynamically.
 *
 * USE THIS PATTERN FOR:
 * - Dynamic key-value pairs (HTTP headers, query params, custom payloads)
 * - User-defined field mapping where both keys and values are configurable
 * - Any fixedCollection type that needs to become a JSON object
 *
 * @param fieldPairs - Array of {name: string, value: any} objects from fixedCollection
 * @param fieldName - Name of the field being constructed (for logging)
 * @param fallback - Fallback value if no fields provided
 * @returns n8n expression string like "={{ { field1: value1, field2: value2 } }}"
 *
 * @example
 * // Input from fixedCollection UI:
 * [
 *   { name: 'contactId', value: '={{ $json.contactId }}' },
 *   { name: 'status', value: 'active' }
 * ]
 * // Output for n8n:
 * "={{ { contactId: $json.contactId, status: "active" } }}"
 */
function convertFixedCollectionToN8nObject(
  fieldPairs: Array<{ name: string; value: any }>,
  fieldName: string,
  fallback: string
): string {
  if (!Array.isArray(fieldPairs) || fieldPairs.length === 0) {
    console.log(`   ⚠️  No fields provided for ${fieldName}, using fallback`);
    return fallback;
  }

  const fieldExpressions: string[] = [];

  fieldPairs.forEach((field: any) => {
    if (!field.name || field.value === undefined) return;

    const name = field.name;
    let value = String(field.value);

    // Check if value is an n8n expression (starts with ={{ or {{)
    if (value.trim().startsWith('={{') || value.trim().startsWith('{{')) {
      // Extract the expression (remove {{ }} or ={{ }} wrappers)
      let expr = value.trim();
      if (expr.startsWith('={{')) {
        expr = expr.slice(3, -2).trim(); // Remove ={{ and }}
      } else if (expr.startsWith('{{')) {
        expr = expr.slice(2, -2).trim(); // Remove {{ and }}
      }
      // Add to object without quotes (it's an expression)
      fieldExpressions.push(`${name}: ${expr}`);
    } else {
      // Static value - wrap in quotes
      fieldExpressions.push(`${name}: "${value}"`);
    }
  });

  // Build n8n expression: ={{ { field1: value1, field2: value2 } }}
  const n8nExpression = `={{ { ${fieldExpressions.join(', ')} } }}`;
  console.log(`   ✅ Converted ${fieldPairs.length} fields to n8n object expression`);
  return n8nExpression;
}

/**
 * Builds the JSON body for an HTTP Request node
 * Merges user-configured parameters with field definitions
 *
 * @param nodeConfig - The node configuration from registry
 * @param userParameters - User's configured values from React Flow
 * @returns JSON body object with resolved values
 */
function buildJsonBody(
  nodeConfig: any,
  userParameters: Record<string, any>
): Record<string, string> {
  const { properties } = nodeConfig;
  const jsonBody: Record<string, string> = {};

  // Use direct field mapping for all nodes
  console.log(`   📋 Using direct field mapping`);
  properties
    .filter((prop: any) => prop.name !== 'options') // Skip internal options
    .forEach((prop: any) => {
      const fieldName = prop.name;
      const userValue = userParameters[fieldName];

      // Skip contactFields - it will be flattened later in body parameters section
      if (fieldName === 'contactFields') {
        console.log(`   ⏭️  Skipping contactFields in buildJsonBody (will be flattened later)`);
        return;
      }

      if (userValue !== undefined && userValue !== '') {
        // User provided a value - use it as-is
        jsonBody[fieldName] = String(userValue);
      } else if (prop.required) {
        // Required field but not provided - use smart default
        // Webhook data lives at $json.body.field
        jsonBody[fieldName] = `{{$json.body.${fieldName}}}`;
      } else if (prop.default && prop.default !== '' && typeof prop.default === 'string' && prop.default.includes('{{')) {
        // Optional field with expression default - include it even if user cleared it
        // This ensures fields like "to" with default "{{$contact.phoneNumber}}" get sent
        jsonBody[fieldName] = prop.default;
      }
      // Skip optional empty fields without defaults
    });

  return jsonBody;
}

/**
 * Converts ReactFlow edges to n8n connections with support for conditional routing through IF nodes
 *
 * Handles two routing patterns:
 * 1. Standard: SourceNode → TargetNode
 * 2. Conditional: SourceNode → IF Node → TargetNode (based on output handle)
 *
 * @param nodes - ReactFlow nodes
 * @param edges - ReactFlow edges
 * @param nodesWithIf - Nodes that have IF nodes injected
 * @returns n8n connections object
 */
function convertEdgesToConnectionsWithConditionalRouting(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  nodesWithIf: Array<{ httpNode: any; config: INodeTypeDescription; originalNode: ReactFlowNode }>,
  waitNodeInjections: Array<{ original: string; set: string; http: string; wait: string }>
): Record<string, any> {
  const connections: Record<string, any> = {};

  // Build maps for quick lookup
  const nodeIdToName = new Map<string, string>();
  const nodesWithIfMap = new Map<string, { httpNode: any; config: INodeTypeDescription }>();

  nodes.forEach((node) => {
    nodeIdToName.set(node.id, node.id); // Map ID → ID (n8n uses pure IDs as names)
  });

  // Add injected wait node IDs to the map
  waitNodeInjections.forEach(({ set, http, wait }) => {
    nodeIdToName.set(set, set);
    nodeIdToName.set(http, http);
    nodeIdToName.set(wait, wait);
  });

  nodesWithIf.forEach(({ httpNode, config, originalNode }) => {
    nodesWithIfMap.set(originalNode.id, { httpNode, config });
  });

  // Group edges by source node
  const edgesBySource = new Map<string, ReactFlowEdge[]>();
  edges.forEach((edge) => {
    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, []);
    }
    edgesBySource.get(edge.source)!.push(edge);
  });

  // Build set of injected node IDs for validation
  const injectedNodeIds = new Set<string>();
  waitNodeInjections.forEach(({ set, http, wait }) => {
    injectedNodeIds.add(set);
    injectedNodeIds.add(http);
    injectedNodeIds.add(wait);
  });

  // Process each source node
  edgesBySource.forEach((sourceEdges, sourceNodeId) => {
    const sourceNodeName = nodeIdToName.get(sourceNodeId);
    if (!sourceNodeName) return;

    // Allow injected nodes (they won't be in the original nodes array)
    const isInjectedNode = injectedNodeIds.has(sourceNodeId);
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode && !isInjectedNode) return;

    const hasConditionalOutput = nodesWithIfMap.has(sourceNodeId);

    if (hasConditionalOutput) {
      // === CONDITIONAL ROUTING ===
      // Route: HTTP Node → IF Node → Target Nodes
      const ifNodeId = `${sourceNodeId}_if`; // Use same pattern as generation
      const ifNodeName = ifNodeId; // IF node name is its ID

      console.log(`   🔀 Setting up conditional routing for "${sourceNodeName}" (node ID: ${sourceNodeId})`);

      // Connection 1: HTTP Node → IF Node (always single connection)
      connections[sourceNodeName] = {
        main: [[
          {
            node: ifNodeName,
            type: 'main',
            index: 0
          }
        ]]
      };

      // Connection 2: IF Node → Target Nodes (split by output handle)
      connections[ifNodeName] = {
        main: [[], []] // Two outputs: [0] = true, [1] = false
      };

      sourceEdges.forEach((edge) => {
        const targetNodeName = nodeIdToName.get(edge.target);
        if (!targetNodeName) return;

        // Determine which IF output this edge connects to
        // Handle both 'true'/'false' (from ConditionNode) and 'output_0'/'output_1' (from ActionNode with conditional output)
        let outputIndex: number;
        if (edge.sourceHandle === 'true' || edge.sourceHandle === 'output_0') {
          outputIndex = 0; // True branch
        } else if (edge.sourceHandle === 'false' || edge.sourceHandle === 'output_1') {
          outputIndex = 1; // False branch
        } else {
          outputIndex = 1; // Default to false if unknown
        }
        const branchLabel = outputIndex === 0 ? 'true' : 'false';

        console.log(`      → IF output[${outputIndex}] (${branchLabel}) → "${targetNodeName}" (sourceHandle: ${edge.sourceHandle})`);

        connections[ifNodeName].main[outputIndex].push({
          node: targetNodeName,
          type: 'main',
          index: 0
        });
      });
    } else {
      // === STANDARD ROUTING ===
      // Group by output handle
      const edgesByOutputHandle = new Map<number, ReactFlowEdge[]>();

      sourceEdges.forEach((edge) => {
        const outputIndex = edge.sourceHandle
          ? parseInt(edge.sourceHandle.replace('output_', '')) || 0
          : 0;

        if (!edgesByOutputHandle.has(outputIndex)) {
          edgesByOutputHandle.set(outputIndex, []);
        }
        edgesByOutputHandle.get(outputIndex)!.push(edge);
      });

      connections[sourceNodeName] = { main: [] };

      // Get max output index
      const maxIndex = Math.max(...Array.from(edgesByOutputHandle.keys()));

      // Initialize arrays
      for (let i = 0; i <= maxIndex; i++) {
        connections[sourceNodeName].main[i] = [];
      }

      // Fill in connections
      edgesByOutputHandle.forEach((edges, outputIndex) => {
        edges.forEach((edge) => {
          const targetNodeName = nodeIdToName.get(edge.target);
          if (!targetNodeName) return;

          connections[sourceNodeName].main[outputIndex].push({
            node: targetNodeName,
            type: 'main',
            index: 0
          });
        });
      });
    }
  });

  // === REWIRE EDGES FOR WAIT NODE INJECTIONS ===
  // For each injected Set → HTTP → Wait chain, we need to:
  // 1. Find all edges pointing to the original wait node
  // 2. Redirect them to point to the Set node instead
  // 3. Wire Set → HTTP → Wait
  // 4. Wire Wait node to whatever the original wait node was connected to
  if (waitNodeInjections.length > 0) {
    console.log(`🔧 Rewiring edges for ${waitNodeInjections.length} wait node injection(s)...`);

    waitNodeInjections.forEach(({ original, set, http, wait }) => {
      console.log(`   🔀 Rewiring edges for wait node: ${original}`);
      console.log(`      Chain: ${set} → ${http} → ${wait}`);
      console.log(`      Verifying nodes in map:`);
      console.log(`         - Set (${set}): ${nodeIdToName.has(set) ? '✅' : '❌'}`);
      console.log(`         - HTTP (${http}): ${nodeIdToName.has(http) ? '✅' : '❌'}`);
      console.log(`         - Wait (${wait}): ${nodeIdToName.has(wait) ? '✅' : '❌'}`);

      // Step 1: Find all incoming edges to the original wait node
      const incomingEdges = edges.filter(edge => edge.target === original);
      console.log(`      Found ${incomingEdges.length} incoming edge(s) to original wait node`);
      if (incomingEdges.length > 0) {
        incomingEdges.forEach(edge => {
          console.log(`         - ${edge.source} → ${edge.target} (handle: ${edge.sourceHandle})`);
        });
      }

      // Step 2: Find all outgoing edges from the original wait node
      const outgoingEdges = edges.filter(edge => edge.source === original);
      console.log(`      Found ${outgoingEdges.length} outgoing edge(s) from original wait node`);
      if (outgoingEdges.length > 0) {
        outgoingEdges.forEach(edge => {
          console.log(`         - ${edge.source} → ${edge.target} (handle: ${edge.targetHandle})`);
        });
      } else {
        console.log(`      ⚠️  WARNING: No outgoing edges found! The wait node chain will be a dead-end.`);
        console.log(`      💡 User should connect the wait node to downstream nodes in the workflow editor.`);
      }

      // Step 3: Rewire incoming edges → Set node
      incomingEdges.forEach(incomingEdge => {
        const sourceNodeName = nodeIdToName.get(incomingEdge.source);
        if (!sourceNodeName) return;

        // Extract output index from sourceHandle
        const outputIndex = incomingEdge.sourceHandle
          ? parseInt(incomingEdge.sourceHandle.replace('output_', '')) || 0
          : 0;

        // Ensure connections array exists
        if (!connections[sourceNodeName]) {
          connections[sourceNodeName] = { main: [] };
        }
        if (!connections[sourceNodeName].main[outputIndex]) {
          connections[sourceNodeName].main[outputIndex] = [];
        }

        // Replace connection to original wait node with connection to Set node
        connections[sourceNodeName].main[outputIndex] =
          connections[sourceNodeName].main[outputIndex].filter((conn: any) => conn.node !== original);

        connections[sourceNodeName].main[outputIndex].push({
          node: set,
          type: 'main',
          index: 0
        });

        console.log(`      ✅ Rewired ${sourceNodeName} → ${set}`);
      });

      // Step 4: Wire Set → HTTP
      connections[set] = {
        main: [[
          {
            node: http,
            type: 'main',
            index: 0
          }
        ]]
      };
      console.log(`      ✅ Wired ${set} → ${http}`);

      // Step 5: Wire HTTP → Wait
      connections[http] = {
        main: [[
          {
            node: wait,
            type: 'main',
            index: 0
          }
        ]]
      };
      console.log(`      ✅ Wired ${http} → ${wait}`);

      // Step 6: Wire Wait → outgoing edges
      if (outgoingEdges.length > 0) {
        connections[wait] = {
          main: [[]]
        };

        outgoingEdges.forEach(outgoingEdge => {
          const targetNodeName = nodeIdToName.get(outgoingEdge.target);
          if (!targetNodeName) return;

          connections[wait].main[0].push({
            node: targetNodeName,
            type: 'main',
            index: 0
          });

          console.log(`      ✅ Wired ${wait} → ${targetNodeName}`);
        });
      }
    });

    console.log(`✅ Edge rewiring complete`);
  }

  return connections;
}

/**
 * Converts ReactFlow edges to n8n connections object (DEPRECATED - Use convertEdgesToConnectionsWithConditionalRouting)
 *
 * n8n connections structure:
 * {
 *   "SourceNodeName": {
 *     "main": [
 *       [{ "node": "TargetNodeName", "type": "main", "index": 0 }],
 *       [{ "node": "AnotherTarget", "type": "main", "index": 0 }]
 *     ]
 *   }
 * }
 */
const convertEdgesToConnections = (
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): Record<string, any> => {
  const connections: Record<string, any> = {};

  // Create a map of node ID to node name for quick lookup
  const nodeIdToName = new Map<string, string>();
  nodes.forEach((node) => {
    nodeIdToName.set(node.id, node.data.label);
  });

  // Group edges by source node and output handle
  const edgesBySource = new Map<string, Map<number, ReactFlowEdge[]>>();

  edges.forEach((edge) => {
    const sourceNodeId = edge.source;

    // Extract output index from sourceHandle (e.g., "output_0" -> 0, "output_1" -> 1)
    // Default to 0 if no handle specified
    const outputIndex = edge.sourceHandle
      ? parseInt(edge.sourceHandle.replace('output_', '')) || 0
      : 0;

    if (!edgesBySource.has(sourceNodeId)) {
      edgesBySource.set(sourceNodeId, new Map());
    }

    const sourceMap = edgesBySource.get(sourceNodeId)!;
    if (!sourceMap.has(outputIndex)) {
      sourceMap.set(outputIndex, []);
    }

    sourceMap.get(outputIndex)!.push(edge);
  });

  // Build n8n connections structure
  edgesBySource.forEach((outputMap, sourceNodeId) => {
    const sourceNodeName = nodeIdToName.get(sourceNodeId);
    if (!sourceNodeName) return;

    connections[sourceNodeName] = {
      main: [],
    };

    // Get the maximum output index to create the right array size
    const maxIndex = Math.max(...Array.from(outputMap.keys()));

    // Initialize array with empty arrays for each output
    for (let i = 0; i <= maxIndex; i++) {
      connections[sourceNodeName].main[i] = [];
    }

    // Fill in the connections
    outputMap.forEach((edges, outputIndex) => {
      edges.forEach((edge) => {
        const targetNodeName = nodeIdToName.get(edge.target);
        if (!targetNodeName) return;

        connections[sourceNodeName].main[outputIndex].push({
          node: targetNodeName,
          type: 'main',
          index: 0, // Target input index (usually 0 for single-input nodes)
        });
      });
    });
  });

  return connections;
};

/**
 * Validates that a ReactFlow workflow has the required structure
 *
 * @param workflow - Workflow to validate
 * @throws Error if workflow is invalid
 */
export const validateReactFlowWorkflow = (workflow: any): void => {
  if (!workflow.name || typeof workflow.name !== 'string') {
    throw new Error('Workflow name is required');
  }

  if (!Array.isArray(workflow.nodes)) {
    throw new Error('Workflow nodes must be an array');
  }

  if (!Array.isArray(workflow.edges)) {
    throw new Error('Workflow edges must be an array');
  }

  // Validate each node has required fields
  workflow.nodes.forEach((node: any, index: number) => {
    if (!node.id) {
      throw new Error(`Node at index ${index} is missing id`);
    }
    if (!node.data?.nodeName) {
      throw new Error(`Node at index ${index} is missing data.nodeName`);
    }
    if (!node.data?.label) {
      throw new Error(`Node at index ${index} is missing data.label`);
    }
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      throw new Error(`Node at index ${index} has invalid position`);
    }
  });
};
