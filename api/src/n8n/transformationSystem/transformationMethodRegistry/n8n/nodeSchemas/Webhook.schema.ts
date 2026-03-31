/**
 * n8n Webhook Node Schema (v1)
 * Source: n8n/packages/nodes-base/nodes/Webhook/Webhook.node.ts
 *
 * The Webhook node creates a webhook endpoint that can receive HTTP requests.
 * We use it for subscription triggers (SMS, phone call, etc.).
 */

export type WebhookHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type WebhookAuthType = 'none' | 'basicAuth' | 'headerAuth';
export type WebhookResponseMode = 'onReceived' | 'lastNode' | 'responseNode';

export interface WebhookNodeParameters {
  httpMethod: WebhookHttpMethod;
  path: string; // Webhook path (e.g., 'webhook-1234567890')
  authentication: WebhookAuthType;
  responseMode: WebhookResponseMode;
  responseData?: string; // When responseMode is 'responseNode'
  responseCode?: number; // HTTP response code
  responseHeaders?: {
    entries: Array<{
      name: string;
      value: string;
    }>;
  };
  options?: Record<string, any>;
}

export interface WebhookNodeConfig {
  id: string;
  name: string;
  type: 'n8n-nodes-base.webhook';
  typeVersion: 1 | 1.1 | 2;
  position: [number, number];
  webhookId: string; // Must match path parameter for n8n to route correctly
  parameters: WebhookNodeParameters;
}

/**
 * Constants for common Webhook node configurations
 */
export const WEBHOOK_NODE_DEFAULTS = {
  type: 'n8n-nodes-base.webhook' as const,
  typeVersion: 1 as const,
  httpMethod: 'POST' as const,
  authentication: 'none' as const,
  responseMode: 'onReceived' as const,
};

/**
 * Helper to create webhook node parameters
 */
export function createWebhookParameters(
  path: string,
  httpMethod: WebhookHttpMethod = 'POST',
  authentication: WebhookAuthType = 'none'
): WebhookNodeParameters {
  return {
    httpMethod,
    path,
    authentication,
    responseMode: 'onReceived',
    options: {},
  };
}
