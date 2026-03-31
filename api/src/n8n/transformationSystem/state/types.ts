/**
 * State Types
 *
 * Type definitions for session state stored in Firestore
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Individual task in the build skeleton
 */
export interface SkeletonTask {
  position: number;              // Execution order (from topological sort)
  methodName: string;            // Transformation method name
  sourceNodeId: string;          // ReactFlow node ID
  sourceNodeType: string;        // ReactFlow node type
  status: 'pending' | 'completed' | 'failed';
}

/**
 * ReactFlow edge (simplified)
 */
export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Session skeleton - the build plan
 */
export interface SessionSkeleton {
  methods: SkeletonTask[];
  edges: ReactFlowEdge[];  // Store ReactFlow edges for connection wiring
  adapterMap?: Record<string, string>;  // Contact adapter mappings (nodeId → adapterNodeId)
  createdAt: Timestamp;
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  status: 'planning' | 'planning_complete' | 'compiling' | 'complete' | 'failed';
  startedAt: Timestamp;
  completedAt?: Timestamp;
  lastUpdatedAt: Timestamp;
  totalMethods: number;
  totalNodesCreated?: number;
  error?: string;
}

/**
 * Transformation edge for internal connections
 */
export interface TransformationEdge {
  from: string;
  to: string;
}

/**
 * Node replacement mapping
 */
export interface NodeReplacement {
  incomingTarget: string;  // Node ID to receive incoming edges
  outgoingSource: string;  // Node ID to send outgoing edges
}

/**
 * Compiled workflow accumulator
 */
export interface CompiledWorkflow {
  nodes: any[];
  internalEdges: TransformationEdge[];  // Edges between injected nodes
  replacements: { [originalNodeId: string]: NodeReplacement };  // Node ID mappings
  lastAppendedAt: Timestamp;
}

/**
 * Processed (adapter-enhanced) ReactFlow workflow
 * Stored separately from the original frontend workflow
 */
export interface ProcessedReactFlow {
  name: string;
  nodes: any[];  // ReactFlow nodes (includes adapter nodes + subflow nodes)
  edges: ReactFlowEdge[];  // ReactFlow edges (includes adapter edges + subflow edges)
  originalNodeCount: number;  // Original node count before adapter injection
  adapterNodeCount: number;  // Number of adapter nodes added
  subflowNodeCount?: number;  // Number of subflow nodes added (switch + duplicated paths)
  createdAt: Timestamp;
}
