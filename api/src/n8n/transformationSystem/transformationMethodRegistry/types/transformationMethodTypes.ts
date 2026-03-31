/**
 * Transformation Method Types
 *
 * Shared type definitions for all transformation method patterns.
 * These types define the contract between transformation patterns, the registry, and the executor.
 */

import type { INodeTypeDescription } from '../../../../workflows/services/nodeRegistry/types';

// ============================================================================
// INPUT TYPES - What transformation patterns receive
// ============================================================================

/**
 * ReactFlow node structure (input to transformation)
 */
export interface ReactFlowNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label?: string;
    nodeName?: string;
    parameters?: Record<string, any>;
    config?: any;
    [key: string]: any;
  };
}

/**
 * ReactFlow edge structure (input to transformation)
 */
export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * ReactFlow workflow structure (complete workflow)
 */
export interface ReactFlowWorkflow {
  name: string;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

/**
 * Context provided to transformation patterns
 * Contains global workflow information needed for transformation decisions
 */
export interface TransformationContext {
  /**
   * All nodes in the ReactFlow workflow
   */
  allNodes: ReactFlowNode[];

  /**
   * All edges in the ReactFlow workflow
   */
  allEdges: ReactFlowEdge[];

  /**
   * Map of ReactFlow node ID to n8n node name
   * Used for looking up connection targets
   */
  nodeIdToName: Map<string, string>;

  /**
   * Workflow-level configuration
   */
  workflowConfig?: {
    name?: string;
    active?: boolean;
    settings?: Record<string, any>;
  };

  /**
   * Base URL for n8n instance (for generating webhook URLs, etc.)
   */
  n8nBaseUrl?: string;

  /**
   * Tenant API key for authentication
   * Used by transformations to inject auth headers
   */
  apiKey?: string;
}

// ============================================================================
// OUTPUT TYPES - What transformation patterns return
// ============================================================================

/**
 * Internal edge connection within a transformation result
 * Defines how injected nodes connect to each other
 */
export interface TransformationEdge {
  /**
   * Source node ID (can be original ReactFlow node ID or injected node ID)
   */
  from: string;

  /**
   * Target node ID (can be original ReactFlow node ID or injected node ID)
   */
  to: string;

  /**
   * Output index on source node (default: 0)
   */
  outputIndex?: number;

  /**
   * Input index on target node (default: 0)
   */
  inputIndex?: number;
}

/**
 * Metadata about a transformation execution
 */
export interface TransformationMetadata {
  /**
   * Name of the transformation that was applied
   */
  transformationName: string;

  /**
   * ID of the original ReactFlow node that triggered this transformation
   */
  originalNodeId: string;

  /**
   * Type of the original ReactFlow node
   */
  originalNodeType: string;

  /**
   * Number of nodes injected/created by this transformation
   */
  nodesCreated: number;

  /**
   * Any warnings generated during transformation
   */
  warnings?: string[];

  /**
   * Additional context-specific metadata
   */
  custom?: Record<string, any>;
}

/**
 * Node replacement mapping for 1:N transformations
 *
 * When a single ReactFlow node expands into multiple n8n nodes (e.g., Wait → Set+HTTP+Wait),
 * this tells the connection builder which n8n nodes to connect to.
 *
 * Example: Original wait node "wait-123" is replaced with Set → HTTP → Wait chain
 * {
 *   incomingTarget: "set_wait-123",  // Incoming edges connect to Set node (first in chain)
 *   outgoingSource: "wait_wait-123"  // Outgoing edges connect from Wait node (last in chain)
 * }
 */
export interface NodeReplacement {
  /**
   * Node ID to use as target for incoming edges
   * This is the FIRST node in the chain
   */
  incomingTarget: string;

  /**
   * Node ID to use as source for outgoing edges
   * This is the LAST node in the chain
   */
  outgoingSource: string;
}

/**
 * Replacement mapping for multiple node transformations
 * Maps original ReactFlow node IDs to their replacement n8n nodes
 */
export interface ReplacementMap {
  [originalNodeId: string]: NodeReplacement;
}

/**
 * Result returned by a transformation pattern
 */
export interface TransformationResult {
  /**
   * n8n nodes created/modified by this transformation
   * These will be added to the final n8n workflow
   */
  nodes: any[];

  /**
   * Internal edges between injected nodes
   * These define how the injected nodes connect to each other
   */
  internalEdges: TransformationEdge[];

  /**
   * Node ID replacements for edge rewiring
   *
   * When a transformation replaces a node, the executor needs to know
   * which injected node to use as the replacement for incoming/outgoing edges.
   *
   * Use this when: 1 ReactFlow node → N n8n nodes
   * Not needed when: 1 ReactFlow node → 1 n8n node (with same ID)
   */
  replacements?: ReplacementMap;

  /**
   * Metadata about the transformation execution
   */
  metadata: TransformationMetadata;
}

// ============================================================================
// TRANSFORMATION INTERFACE - What all patterns must implement
// ============================================================================

/**
 * Base interface that all transformation patterns must implement
 */
export interface Transformation {
  /**
   * Unique name of this transformation
   * Should match the key used in the registry
   */
  readonly name: string;

  /**
   * Priority for this transformation (higher = runs first)
   * Used when multiple transformations could apply to the same node
   */
  readonly priority: number;

  /**
   * Check if this transformation should be applied to a node
   *
   * @param node - ReactFlow node to check
   * @param config - Node type configuration (optional, may not be available)
   * @returns true if this transformation should be applied
   */
  matches(node: ReactFlowNode, config?: INodeTypeDescription): boolean;

  /**
   * Transform a ReactFlow node into n8n nodes
   *
   * @param node - ReactFlow node to transform
   * @param config - Node type configuration
   * @param context - Workflow context
   * @returns Transformation result with n8n nodes and edges
   */
  transform(
    node: ReactFlowNode,
    config: INodeTypeDescription,
    context: TransformationContext
  ): TransformationResult | Promise<TransformationResult>;

  /**
   * Optional validation hook for debugging
   * Throws if the result is invalid
   *
   * @param result - Transformation result to validate
   */
  validate?(result: TransformationResult): void;
}

// ============================================================================
// UTILITY TYPES - Helpers for the transformation system
// ============================================================================

/**
 * Registry entry for a transformation
 */
export interface TransformationRegistryEntry {
  /**
   * Unique key for this transformation
   */
  key: string;

  /**
   * The transformation implementation
   */
  transformation: Transformation;
}

/**
 * Type guard to check if an object is a valid TransformationResult
 */
export function isTransformationResult(obj: any): obj is TransformationResult {
  return (
    obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.nodes) &&
    Array.isArray(obj.internalEdges) &&
    obj.metadata &&
    typeof obj.metadata.transformationName === 'string' &&
    typeof obj.metadata.originalNodeId === 'string'
  );
}

/**
 * Type guard to check if an object is a valid TransformationEdge
 */
export function isValidTransformationEdge(edge: any): edge is TransformationEdge {
  return (
    edge &&
    typeof edge === 'object' &&
    typeof edge.from === 'string' &&
    typeof edge.to === 'string' &&
    (edge.outputIndex === undefined || typeof edge.outputIndex === 'number') &&
    (edge.inputIndex === undefined || typeof edge.inputIndex === 'number')
  );
}

/**
 * Type guard to check if an object implements the Transformation interface
 */
export function isTransformation(obj: any): obj is Transformation {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.priority === 'number' &&
    typeof obj.matches === 'function' &&
    typeof obj.transform === 'function'
  );
}
