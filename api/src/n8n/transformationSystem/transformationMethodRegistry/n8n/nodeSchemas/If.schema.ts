/**
 * n8n IF Node Schema (v2)
 * Source: n8n/packages/nodes-base/nodes/If/V2/IfV2.node.ts
 *
 * The IF node allows conditional routing based on data comparisons.
 * We use it for conditional output from custom action nodes.
 */

export type IfOperatorType = 'string' | 'number' | 'boolean' | 'dateTime' | 'array' | 'object';

export interface IfCondition {
  id: string;
  leftValue: string; // n8n expression (e.g., '={{$json.found}}')
  rightValue?: any; // Value to compare against (can be undefined for single-value operators)
  operator: {
    type: IfOperatorType;
    operation: string; // e.g., 'equals', 'contains', 'true', 'false', etc.
    singleValue?: boolean; // true for operators like 'isEmpty', 'true', 'false'
  };
}

export interface IfNodeParameters {
  conditions: {
    options: {
      caseSensitive?: boolean;
      leftValue?: string;
      typeValidation?: 'strict' | 'loose';
    };
    conditions: IfCondition[];
    combinator: 'and' | 'or';
  };
  options?: Record<string, any>;
}

export interface IfNodeConfig {
  id: string;
  name: string;
  type: 'n8n-nodes-base.if';
  typeVersion: 2;
  position: [number, number];
  parameters: IfNodeParameters;
}

/**
 * Constants for common IF node configurations
 */
export const IF_NODE_DEFAULTS = {
  type: 'n8n-nodes-base.if' as const,
  typeVersion: 2,
  combinator: 'and' as const,
  caseSensitive: true,
  typeValidation: 'strict' as const,
};

/**
 * Helper to create a boolean condition (checks if field is true/false)
 */
export function createBooleanCondition(
  id: string,
  field: string,
  expectedValue: boolean
): IfCondition {
  return {
    id,
    leftValue: `={{$json.${field}}}`,
    rightValue: expectedValue,
    operator: {
      type: 'boolean',
      operation: expectedValue ? 'true' : 'false',
      singleValue: true,
    },
  };
}

/**
 * Helper to create a string condition
 */
export function createStringCondition(
  id: string,
  field: string,
  operation: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'regex' | 'isEmpty' | 'isNotEmpty',
  compareValue?: string
): IfCondition {
  return {
    id,
    leftValue: `={{$json.${field}}}`,
    rightValue: compareValue,
    operator: {
      type: 'string',
      operation,
      singleValue: operation === 'isEmpty' || operation === 'isNotEmpty',
    },
  };
}

/**
 * Helper to create a number condition
 */
export function createNumberCondition(
  id: string,
  field: string,
  operation: 'equals' | 'notEquals' | 'gt' | 'lt' | 'gte' | 'lte',
  compareValue: number
): IfCondition {
  return {
    id,
    leftValue: `={{$json.${field}}}`,
    rightValue: compareValue,
    operator: {
      type: 'number',
      operation,
      singleValue: false,
    },
  };
}
