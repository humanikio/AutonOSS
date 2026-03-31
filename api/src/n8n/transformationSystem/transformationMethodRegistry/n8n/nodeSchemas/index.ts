/**
 * n8n Node Schemas - Index
 *
 * Exports all n8n node type definitions used in transformation patterns.
 * These schemas represent the exact structure n8n expects in workflow JSON.
 */

export * from './Set.schema';
export * from './HttpRequest.schema';
export * from './Wait.schema';
export * from './Webhook.schema';
export * from './If.schema';
export * from './Switch.schema';

/**
 * Union type of all n8n node configurations we support
 */
import type { SetNodeConfig } from './Set.schema';
import type { HttpRequestNodeConfig } from './HttpRequest.schema';
import type { WaitNodeConfig } from './Wait.schema';
import type { WebhookNodeConfig } from './Webhook.schema';
import type { IfNodeConfig } from './If.schema';
import type { SwitchNodeConfig } from './Switch.schema';

export type N8nNodeConfig =
  | SetNodeConfig
  | HttpRequestNodeConfig
  | WaitNodeConfig
  | WebhookNodeConfig
  | IfNodeConfig
  | SwitchNodeConfig;

/**
 * Base properties common to all n8n nodes
 */
export interface N8nNodeBase {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
}

/**
 * Helper to validate if an object is a valid n8n node
 */
export function isN8nNode(obj: any): obj is N8nNodeBase {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.typeVersion === 'number' &&
    Array.isArray(obj.position) &&
    obj.position.length === 2 &&
    typeof obj.parameters === 'object'
  );
}
