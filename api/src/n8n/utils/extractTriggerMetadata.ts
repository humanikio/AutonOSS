/**
 * Extracts trigger metadata from n8n workflow nodes
 * This utility identifies trigger nodes and extracts relevant metadata
 * including webhook URLs, schedules, and other trigger-specific information
 */

export interface TriggerMetadata {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  triggerType: 'webhook' | 'schedule' | 'manual' | 'email' | 'other';

  // Webhook-specific (only if triggerType === "webhook")
  url?: string;
  webhookId?: string;
  httpMethod?: string;
  path?: string;
  authentication?: string;

  // Schedule-specific (only if triggerType === "schedule")
  cronExpression?: string;
  timezone?: string;

  // Metadata
  position: [number, number];
  parameters: any;
}

/**
 * Extract all trigger metadata from workflow nodes
 */
export function extractTriggerMetadata(nodes: any[]): TriggerMetadata[] {
  const n8nBaseUrl = process.env.N8N_API_URL;
  const triggerNodes = nodes.filter(isTriggerNode);

  console.log(`🔍 Found ${triggerNodes.length} trigger node(s) in workflow`);

  return triggerNodes.map(node => {
    const metadata: TriggerMetadata = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      triggerType: getTriggerType(node.type),
      position: node.position,
      parameters: node.parameters || {}
    };

    // Webhook-specific extraction
    if (node.type === 'n8n-nodes-base.webhook') {
      const webhookId = node.webhookId || node.parameters?.path;
      metadata.webhookId = webhookId;
      metadata.path = node.parameters?.path;
      metadata.httpMethod = node.parameters?.httpMethod || 'POST';
      metadata.authentication = node.parameters?.authentication || 'none';

      if (n8nBaseUrl && webhookId) {
        metadata.url = `${n8nBaseUrl}/webhook/${webhookId}`;
        console.log(`   📍 Webhook URL: ${metadata.url}`);
      } else {
        console.warn(`   ⚠️  Could not generate webhook URL (baseUrl: ${n8nBaseUrl}, webhookId: ${webhookId})`);
      }
    }

    // Schedule-specific extraction
    if (node.type === 'n8n-nodes-base.scheduleTrigger') {
      metadata.cronExpression = node.parameters?.rule;
      metadata.timezone = node.parameters?.timezone;
      console.log(`   ⏰ Schedule: ${metadata.cronExpression} (${metadata.timezone || 'UTC'})`);
    }

    // Manual trigger
    if (node.type === 'n8n-nodes-base.manualTrigger') {
      console.log(`   👆 Manual trigger (testing only)`);
    }

    // Email trigger
    if (node.type === 'n8n-nodes-base.emailTrigger') {
      console.log(`   📧 Email trigger (IMAP polling)`);
    }

    return metadata;
  });
}

/**
 * Check if a node is a trigger node
 */
function isTriggerNode(node: any): boolean {
  const triggerTypes = [
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.scheduleTrigger',
    'n8n-nodes-base.manualTrigger',
    'n8n-nodes-base.emailTrigger',
    'n8n-nodes-base.cronTrigger',
    'n8n-nodes-base.sshTrigger',
    'n8n-nodes-base.rssTrigger',
    'n8n-nodes-base.gitTrigger'
    // Add more trigger types as needed
  ];
  return triggerTypes.includes(node.type);
}

/**
 * Determine the trigger type from node type
 */
function getTriggerType(nodeType: string): TriggerMetadata['triggerType'] {
  if (nodeType.includes('webhook')) return 'webhook';
  if (nodeType.includes('schedule') || nodeType.includes('cron')) return 'schedule';
  if (nodeType.includes('manual')) return 'manual';
  if (nodeType.includes('email')) return 'email';
  return 'other';
}

/**
 * Get webhook URLs only (convenience function)
 */
export function extractWebhookUrls(nodes: any[]): string[] {
  const triggers = extractTriggerMetadata(nodes);
  return triggers
    .filter(t => t.url)
    .map(t => t.url!);
}
