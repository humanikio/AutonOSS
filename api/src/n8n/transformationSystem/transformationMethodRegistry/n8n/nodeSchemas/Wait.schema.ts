/**
 * n8n Wait Node Schema (v1.1)
 * Source: n8n/packages/nodes-base/nodes/Wait/Wait.node.ts
 *
 * The Wait node pauses workflow execution until a specified condition is met.
 * We use it in 'webhook' mode for appointment milestone waits.
 */

export type WaitResumeMode = 'timeInterval' | 'specificTime' | 'webhook' | 'form';

export interface WaitNodeParameters {
  resume: WaitResumeMode;

  // Webhook mode parameters
  path?: string; // Webhook path for resume (e.g., 'wait-abc123')
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';

  // Time interval mode parameters
  amount?: number;
  unit?: 'seconds' | 'minutes' | 'hours' | 'days';

  // Specific time mode parameters
  resumeAt?: string; // ISO date string

  // Options
  options?: {
    limitWaitTime?: boolean;
    limitType?: 'afterTimeInterval' | 'atSpecifiedTime';
    resumeAmount?: number;
    resumeUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
  };
}

export interface WaitNodeConfig {
  id: string;
  name: string;
  type: 'n8n-nodes-base.wait';
  typeVersion: 1 | 1.1;
  position: [number, number];
  webhookId?: string; // Required for webhook mode - must match path parameter
  parameters: WaitNodeParameters;
}

/**
 * Constants for common Wait node configurations
 */
export const WAIT_NODE_DEFAULTS = {
  type: 'n8n-nodes-base.wait' as const,
  typeVersion: 1.1 as const,
  resume: 'webhook' as const,
  httpMethod: 'POST' as const,
};

/**
 * Helper to create webhook wait node parameters
 */
export function createWebhookWaitParameters(
  webhookPath: string,
  httpMethod: 'GET' | 'POST' = 'POST'
): WaitNodeParameters {
  return {
    resume: 'webhook',
    path: webhookPath,
    httpMethod,
    options: {},
  };
}
