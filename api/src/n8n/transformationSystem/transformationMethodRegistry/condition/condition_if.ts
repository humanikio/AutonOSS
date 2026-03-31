/**
 * IF Condition Transformation
 * Transforms Pulseline IF node to native n8n IF node (v2)
 * Handles multiple condition types: boolean, string, number, and tagCheck
 */

import type {
  Transformation,
  TransformationResult,
  TransformationContext,
  ReactFlowNode,
} from '../types/transformationMethodTypes';
import type { INodeTypeDescription } from '../../../../workflows/services/nodeRegistry/types';
import type { IfNodeConfig, IfNodeParameters, IfCondition } from '../n8n/nodeSchemas/If.schema';
import { IF_NODE_DEFAULTS } from '../n8n/nodeSchemas/If.schema';
import { normalizeExpression } from '../utils/expressionHelpers';

export class IfConditionTransformation implements Transformation {
  readonly name = 'condition_if';
  readonly priority = 50;

  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean {
    return config?.name === 'if';
  }

  transform(
    node: ReactFlowNode,
    config: INodeTypeDescription,
    context: TransformationContext
  ): TransformationResult {
    const { id, position, data } = node;
    const nodeParams = data?.parameters || {};

    const conditionType = nodeParams.conditionType || 'boolean';
    const field = nodeParams.field || '';

    // Build the IF condition based on type
    const condition = this.buildCondition(id, conditionType, field, nodeParams);

    const ifParameters: IfNodeParameters = {
      conditions: {
        options: {
          caseSensitive: true,
          typeValidation: 'strict',
        },
        conditions: [condition],
        combinator: 'and',
      },
      options: {},
    };

    const ifNode: IfNodeConfig = {
      id,
      name: id, // Use node ID for stable references (matches legacy pattern)
      type: IF_NODE_DEFAULTS.type,
      typeVersion: 2,
      position: [position.x, position.y],
      parameters: ifParameters,
    };

    return {
      nodes: [ifNode],
      internalEdges: [],
      replacements: {},
      metadata: {
        transformationName: this.name,
        originalNodeId: id,
        originalNodeType: node.type,
        nodesCreated: 1,
        custom: {
          conditionType,
          field,
        },
      },
    };
  }

  /**
   * Build an IF condition based on the condition type and parameters
   */
  private buildCondition(
    nodeId: string,
    conditionType: string,
    field: string,
    nodeParams: any
  ): IfCondition {
    const conditionId = `${nodeId}-condition-0`;

    switch (conditionType) {
      case 'boolean':
        return this.buildBooleanCondition(conditionId, field, nodeParams);

      case 'string':
        return this.buildStringCondition(conditionId, field, nodeParams);

      case 'number':
        return this.buildNumberCondition(conditionId, field, nodeParams);

      case 'tagCheck':
        return this.buildTagCheckCondition(conditionId, field, nodeParams);

      default:
        // Default to boolean check
        return this.buildBooleanCondition(conditionId, field, nodeParams);
    }
  }

  /**
   * Build a boolean condition (true/false check)
   */
  private buildBooleanCondition(id: string, field: string, nodeParams: any): IfCondition {
    const operation = nodeParams.booleanOperation || 'true';
    const leftValue = normalizeExpression(field);

    return {
      id,
      leftValue,
      rightValue: undefined,
      operator: {
        type: 'boolean',
        operation,
        singleValue: true,
      },
    };
  }

  /**
   * Build a string condition
   */
  private buildStringCondition(id: string, field: string, nodeParams: any): IfCondition {
    const operation = nodeParams.stringOperation || 'equals';
    const compareValue = nodeParams.compareValue || '';
    const leftValue = normalizeExpression(field);

    // Check if compareValue is an expression or literal
    const rightValue = compareValue.includes('{{') || compareValue.startsWith('=')
      ? normalizeExpression(compareValue)
      : compareValue;

    const isSingleValue = operation === 'isEmpty' || operation === 'isNotEmpty';

    return {
      id,
      leftValue,
      rightValue: isSingleValue ? undefined : rightValue,
      operator: {
        type: 'string',
        operation,
        singleValue: isSingleValue,
      },
    };
  }

  /**
   * Build a number condition
   */
  private buildNumberCondition(id: string, field: string, nodeParams: any): IfCondition {
    const operation = nodeParams.numberOperation || 'equals';
    const compareValue = nodeParams.compareValue;
    const leftValue = normalizeExpression(field);

    // Map our operation names to n8n's operation names
    const operationMap: Record<string, string> = {
      'equals': 'equals',
      'notEquals': 'notEquals',
      'greaterThan': 'gt',
      'lessThan': 'lt',
      'greaterOrEqual': 'gte',
      'lessOrEqual': 'lte',
    };

    const n8nOperation = operationMap[operation] || operation;

    // Check if compareValue is an expression or a number
    let rightValue: any = compareValue;
    if (typeof compareValue === 'string' && (compareValue.includes('{{') || compareValue.startsWith('='))) {
      rightValue = normalizeExpression(compareValue);
    } else {
      rightValue = Number(compareValue);
    }

    return {
      id,
      leftValue,
      rightValue,
      operator: {
        type: 'number',
        operation: n8nOperation,
        singleValue: false,
      },
    };
  }

  /**
   * Build a tag check condition
   * This checks if a contact has a specific tag or any/no tags
   *
   * NOTE: Uses STRING operations because n8n treats the tags array as a string
   * This matches the legacy pattern from convertReactFlow2N8n.ts
   */
  private buildTagCheckCondition(id: string, field: string, nodeParams: any): IfCondition {
    const tagOperation = nodeParams.tagOperation || 'hasTag';
    const tagId = nodeParams.tagId;

    // Use the field parameter if provided (already resolved by custom field resolver)
    // Otherwise fall back to default $json.tags
    const leftValue = field ? normalizeExpression(field) : '={{$json.tags}}';

    // Tag check uses STRING operations since n8n treats the tags array as a string
    // This is the legacy pattern that works correctly

    switch (tagOperation) {
      case 'hasTag':
        // Check if tags string contains the specific tagId
        return {
          id,
          leftValue,
          rightValue: tagId,
          operator: {
            type: 'string',
            operation: 'contains',
            singleValue: false,
          },
        };

      case 'notHasTag':
        // Check if tags string does NOT contain the specific tagId
        return {
          id,
          leftValue,
          rightValue: tagId,
          operator: {
            type: 'string',
            operation: 'notContains',
            singleValue: false,
          },
        };

      case 'hasAnyTags':
        // Check if tags string is not empty
        return {
          id,
          leftValue,
          rightValue: undefined,
          operator: {
            type: 'string',
            operation: 'isNotEmpty',
            singleValue: true,
          },
        };

      case 'hasNoTags':
        // Check if tags string is empty
        return {
          id,
          leftValue,
          rightValue: undefined,
          operator: {
            type: 'string',
            operation: 'isEmpty',
            singleValue: true,
          },
        };

      default:
        // Default to hasTag check
        return {
          id,
          leftValue,
          rightValue: tagId,
          operator: {
            type: 'string',
            operation: 'contains',
            singleValue: false,
          },
        };
    }
  }
}

export const condition_if = new IfConditionTransformation();
