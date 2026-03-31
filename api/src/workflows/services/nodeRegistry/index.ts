/**
 * Node Registry Service
 * Central service for managing all available workflow nodes
 */

import { INodeTypeDescription, NodeListItem } from './types';

// Import trigger nodes
import { webhookNode } from './nodes/trigger/webhook.config';
import { smsReceivedTriggerNode } from './nodes/trigger/smsReceivedTrigger.config';
import { phoneCallCompletedTriggerNode } from './nodes/trigger/phoneCallCompletedTrigger.config';
import { eventLifecycleMilestoneTriggerNode } from './nodes/trigger/eventLifecycleMilestoneTrigger.config';

// Import action nodes
import { httpRequestNode } from './nodes/action/httpRequest.config';
import { waitNode } from './nodes/action/wait.config';
import { triggerWorkflowNode } from './nodes/action/triggerWorkflow.config';
import { aiProcessingNode } from './nodes/action/aiProcessing.config';

// Import condition nodes
import { ifNode } from './nodes/condition/if.config';
import { switchNode } from './nodes/condition/switch.config';

// Import Pulseline custom nodes - Contacts
import { pulselineCreateContactNode } from './nodes/pulseline/createContact.config';
import { pulselineUpdateContactNode } from './nodes/pulseline/updateContact.config';
import { pulselineDeleteContactNode } from './nodes/pulseline/deleteContact.config';
import { pulselineFindContactNode } from './nodes/pulseline/findContact.config';
import { pulselineAddContactTagNode } from './nodes/pulseline/addContactTag.config';
import { pulselineRemoveContactTagNode } from './nodes/pulseline/removeContactTag.config';

// Import Pulseline custom nodes - Opportunities
import { pulselineCreateOpportunityNode } from './nodes/opportunities/createOpportunity.config';
import { pulselineUpdateOpportunityNode } from './nodes/opportunities/updateOpportunity.config';
import { pulselineDeleteOpportunityNode } from './nodes/opportunities/deleteOpportunity.config';

// Import Pulseline custom nodes - SMS
import { pulselineSendSmsNode } from './nodes/sms/sendSms.config';
import { pulselineInboundAgentSmsNode } from './nodes/sms/inboundAgentSms.config';
import { pulselineOutboundAgentSmsNode } from './nodes/sms/outboundAgentSms.config';

// Import Pulseline custom nodes - Email
import { pulselineSendEmailNode } from './nodes/sms/sendEmail.config';

// Import Pulseline custom nodes - Phone
import { pulselineOutboundCallNode } from './nodes/phone/outboundCall.config';

// Import Adapter nodes
import { contactAdapterNode } from './nodes/adapters/contactAdapter.config';

/**
 * Registry of all available nodes
 * Key = node name, Value = full node configuration
 */
const nodeConfigs: Record<string, INodeTypeDescription> = {
  // Triggers
  webhook: webhookNode,
  smsReceivedTrigger: smsReceivedTriggerNode,
  phoneCallCompletedTrigger: phoneCallCompletedTriggerNode,
  eventLifecycleMilestoneTrigger: eventLifecycleMilestoneTriggerNode,

  // Actions
  httpRequest: httpRequestNode,
  wait: waitNode,
  triggerWorkflow: triggerWorkflowNode,
  aiProcessing: aiProcessingNode,

  // Conditions
  if: ifNode,
  switch: switchNode,

  // Pulseline Custom Nodes - Contacts
  pulselineCreateContact: pulselineCreateContactNode,
  pulselineUpdateContact: pulselineUpdateContactNode,
  pulselineDeleteContact: pulselineDeleteContactNode,
  pulselineFindContact: pulselineFindContactNode,
  pulselineAddContactTag: pulselineAddContactTagNode,
  pulselineRemoveContactTag: pulselineRemoveContactTagNode,

  // Pulseline Custom Nodes - Opportunities
  pulselineCreateOpportunity: pulselineCreateOpportunityNode,
  pulselineUpdateOpportunity: pulselineUpdateOpportunityNode,
  pulselineDeleteOpportunity: pulselineDeleteOpportunityNode,

  // Pulseline Custom Nodes - SMS
  pulselineSendSms: pulselineSendSmsNode,
  pulselineInboundAgentSms: pulselineInboundAgentSmsNode,
  pulselineOutboundAgentSms: pulselineOutboundAgentSmsNode,

  // Pulseline Custom Nodes - Email
  pulselineSendEmail: pulselineSendEmailNode,

  // Pulseline Custom Nodes - Phone
  pulselineOutboundCall: pulselineOutboundCallNode,

  // Adapter Nodes
  contactAdapter: contactAdapterNode,
};

/**
 * Helper function to categorize nodes
 */
function categorizeNode(node: INodeTypeDescription): 'trigger' | 'action' | 'condition' {
  // Triggers have no inputs
  if (node.inputs.length === 0 || (Array.isArray(node.inputs) && node.inputs.length === 0)) {
    return 'trigger';
  }

  // Conditions have multiple outputs (IF/Switch nodes and custom nodes with conditional logic)
  if (
    typeof node.outputs === 'string' ||
    (Array.isArray(node.outputs) && node.outputs.length > 1) ||
    node.outputNames
  ) {
    return 'condition';
  }

  // Everything else is an action
  return 'action';
}

/**
 * Node Registry Service
 */
export class NodeRegistry {
  /**
   * Get lightweight list of all available nodes (for UI listing)
   */
  static getAllNodes(): NodeListItem[] {
    return Object.values(nodeConfigs).map((config) => ({
      name: config.name,
      displayName: config.displayName,
      description: config.description,
      group: config.group,
      icon: config.icon,
      iconUrl: config.iconUrl,
      version: config.version,
      category: categorizeNode(config),
    }));
  }

  /**
   * Get full configuration for a specific node
   */
  static getNodeConfig(nodeName: string): INodeTypeDescription | null {
    return nodeConfigs[nodeName] || null;
  }

  /**
   * Get nodes filtered by category
   */
  static getNodesByCategory(category: 'trigger' | 'action' | 'condition'): NodeListItem[] {
    return this.getAllNodes().filter((node) => node.category === category);
  }

  /**
   * Check if a node exists in the registry
   */
  static hasNode(nodeName: string): boolean {
    return nodeName in nodeConfigs;
  }

  /**
   * Get all available node names
   */
  static getNodeNames(): string[] {
    return Object.keys(nodeConfigs);
  }

  /**
   * Create a new node instance with default values from config
   * This is useful when adding a node to a workflow
   */
  static createNodeInstance(
    nodeName: string,
    position: [number, number],
    customName?: string
  ): any {
    const config = this.getNodeConfig(nodeName);
    if (!config) {
      throw new Error(`Node type "${nodeName}" not found in registry`);
    }

    // Get default parameters from config
    const defaultParameters: Record<string, any> = {};
    config.properties.forEach((param) => {
      if (param.default !== undefined) {
        defaultParameters[param.name] = param.default;
      }
    });

    // Get highest version number
    const version = Array.isArray(config.version)
      ? Math.max(...config.version)
      : config.version;

    return {
      id: `${nodeName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: customName || config.defaults.name,
      type: `n8n-nodes-base.${nodeName}`,
      typeVersion: version,
      position,
      parameters: defaultParameters,
    };
  }

  /**
   * Validate a node instance against its config
   */
  static validateNode(node: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Extract node name from type (e.g., 'n8n-nodes-base.webhook' -> 'webhook')
    const nodeName = node.type?.split('.').pop();
    if (!nodeName) {
      errors.push('Invalid node type format');
      return { valid: false, errors };
    }

    const config = this.getNodeConfig(nodeName);
    if (!config) {
      errors.push(`Unknown node type: ${nodeName}`);
      return { valid: false, errors };
    }

    // Validate required parameters
    const requiredParams = config.properties
      .filter((p) => p.required === true)
      .map((p) => p.name);

    for (const param of requiredParams) {
      if (!(param in node.parameters)) {
        errors.push(`Missing required parameter "${param}" for node "${node.name}"`);
      }
    }

    // Validate version
    const validVersions = Array.isArray(config.version) ? config.version : [config.version];
    if (!validVersions.includes(node.typeVersion)) {
      errors.push(
        `Invalid version ${node.typeVersion} for node "${nodeName}". Valid versions: ${validVersions.join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get node count by category
   */
  static getNodeStats(): { total: number; triggers: number; actions: number; conditions: number } {
    const all = this.getAllNodes();
    return {
      total: all.length,
      triggers: all.filter((n) => n.category === 'trigger').length,
      actions: all.filter((n) => n.category === 'action').length,
      conditions: all.filter((n) => n.category === 'condition').length,
    };
  }
}
