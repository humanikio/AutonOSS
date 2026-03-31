/**
 * n8n Set Node Schema (v3.4)
 * Source: n8n/packages/nodes-base/nodes/Set/v2/SetV2.node.ts
 *
 * The Set node allows you to edit/add fields on items passing through.
 * We use it in manual mode with assignments to capture execution metadata.
 */

export interface SetNodeAssignment {
  id: string;
  name: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

export interface SetNodeParameters {
  mode: 'manual' | 'raw';
  duplicateItem: boolean;
  assignments?: {
    assignments: SetNodeAssignment[];
  };
  includeOtherFields?: boolean;
  options?: {
    dotNotation?: boolean;
    ignoreConversionErrors?: boolean;
    stripBinary?: boolean;
  };
}

export interface SetNodeConfig {
  id: string;
  name: string;
  type: 'n8n-nodes-base.set';
  typeVersion: 3.4;
  position: [number, number];
  parameters: SetNodeParameters;
}

/**
 * Constants for common Set node configurations
 */
export const SET_NODE_DEFAULTS = {
  type: 'n8n-nodes-base.set' as const,
  typeVersion: 3.4 as const,
  mode: 'manual' as const,
  duplicateItem: false,
};

/**
 * Helper to create a Set node assignment
 */
export function createSetAssignment(
  id: string,
  name: string,
  value: string,
  type: SetNodeAssignment['type'] = 'string'
): SetNodeAssignment {
  return { id, name, value, type };
}
