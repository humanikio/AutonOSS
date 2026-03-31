/**
 * n8n Switch Node Schema (v3)
 * Source: n8n/packages/nodes-base/nodes/Switch/V3/SwitchV3.node.ts
 *
 * The Switch node routes data to different outputs based on conditions or expressions.
 * Used for subflow routing in milestone wait scenarios.
 */

export type SwitchMode = 'rules' | 'expression';

export type SwitchOperatorType = 'string' | 'number' | 'boolean' | 'dateTime' | 'array' | 'object';

export interface SwitchCondition {
  id: string;
  leftValue: string; // n8n expression
  rightValue?: any;
  operator: {
    type: SwitchOperatorType;
    operation: string; // 'equals', 'contains', 'gt', 'lt', etc.
    singleValue?: boolean;
  };
}

export interface SwitchRule {
  outputKey?: string; // Custom name for the output
  conditions: {
    options: {
      caseSensitive?: boolean;
      leftValue?: string;
      typeValidation?: 'strict' | 'loose';
    };
    conditions: SwitchCondition[];
    combinator: 'and' | 'or';
  };
}

export interface SwitchRulesParameters {
  mode: 'rules';
  rules: {
    values: SwitchRule[];
  };
  options?: {
    fallbackOutput?: 'extra' | 'none';
    renameFallbackOutput?: string;
    allMatchingOutputs?: boolean;
  };
}

export interface SwitchExpressionParameters {
  mode: 'expression';
  output: number | string; // Expression that returns output index
  numberOutputs: number; // Number of outputs to create
  expression?: string; // Optional: the expression itself
  options?: Record<string, any>;
}

export type SwitchNodeParameters = SwitchRulesParameters | SwitchExpressionParameters;

export interface SwitchNodeConfig {
  id: string;
  name: string;
  type: 'n8n-nodes-base.switch';
  typeVersion: 3;
  position: [number, number];
  parameters: SwitchNodeParameters;
}

/**
 * Constants for common Switch node configurations
 */
export const SWITCH_NODE_DEFAULTS = {
  type: 'n8n-nodes-base.switch' as const,
  typeVersion: 3,
  mode: 'expression' as const,
  numberOutputs: 4,
};

/**
 * Helper to create an expression-based switch node
 * Used for subflow routing with runtime determination
 */
export function createExpressionSwitch(
  id: string,
  name: string,
  expression: string,
  numberOutputs: number,
  position: [number, number]
): SwitchNodeConfig {
  return {
    id,
    name,
    type: 'n8n-nodes-base.switch',
    typeVersion: 3,
    position,
    parameters: {
      mode: 'expression',
      output: expression,
      numberOutputs,
    },
  };
}

/**
 * Helper to create a rules-based switch node
 */
export function createRulesSwitch(
  id: string,
  name: string,
  rules: SwitchRule[],
  position: [number, number],
  options?: {
    fallbackOutput?: 'extra' | 'none';
    renameFallbackOutput?: string;
  }
): SwitchNodeConfig {
  return {
    id,
    name,
    type: 'n8n-nodes-base.switch',
    typeVersion: 3,
    position,
    parameters: {
      mode: 'rules',
      rules: {
        values: rules,
      },
      options,
    },
  };
}

/**
 * Helper to create a switch rule with a single condition
 */
export function createSwitchRule(
  outputKey: string,
  field: string,
  operation: string,
  compareValue: any,
  operatorType: SwitchOperatorType = 'string'
): SwitchRule {
  return {
    outputKey,
    conditions: {
      options: {
        caseSensitive: true,
        typeValidation: 'strict',
      },
      conditions: [
        {
          id: crypto.randomUUID(),
          leftValue: `={{$json.${field}}}`,
          rightValue: compareValue,
          operator: {
            type: operatorType,
            operation,
          },
        },
      ],
      combinator: 'and',
    },
  };
}
