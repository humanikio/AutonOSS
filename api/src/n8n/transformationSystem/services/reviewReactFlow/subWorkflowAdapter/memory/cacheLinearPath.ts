/**
 * Linear Path Queue (In-Memory Cache)
 *
 * Manages queue of linear paths detected for subflow creation.
 * In-memory only - data cleared after planning phase completes.
 */

import type { ReactFlowNode } from '../../../../transformationMethodRegistry/types/transformationMethodTypes';

/**
 * Subflow path detected during graph analysis
 */
export interface SubflowPath {
  pathId: string;           // 'path1', 'path2', etc.
  triggerType: string;      // 'milestoneWait'
  nodes: ReactFlowNode[];   // Ordered nodes in linear path
  triggers: ReactFlowNode[]; // Subset of nodes that are subflow triggers
  startIndex: number;       // Index in topological order where path starts
  endIndex: number;         // Index in topological order where path ends
}

/**
 * Queue status
 */
export interface QueueStatus {
  total: number;
  completed: number;
  remaining: number;
  nextPath: string | null;
}

// In-memory storage
const pathQueue = new Map<string, SubflowPath>();
let processingOrder: string[] = [];
let completedPaths = new Set<string>();

/**
 * Add a path to the queue
 */
export function addPath(path: SubflowPath): void {
  pathQueue.set(path.pathId, path);
  processingOrder.push(path.pathId);
  console.log(`   =� Queued: ${path.pathId} (${path.triggers.length} triggers)`);
}

/**
 * Get next unprocessed path from queue
 * Returns null if all paths completed
 */
export function getNextPath(): SubflowPath | null {
  for (const pathId of processingOrder) {
    if (!completedPaths.has(pathId)) {
      const path = pathQueue.get(pathId);
      if (path) {
        console.log(`   =� Dequeued: ${pathId}`);
        return path;
      }
    }
  }
  return null;
}

/**
 * Mark a path as completed
 */
export function markComplete(pathId: string): void {
  completedPaths.add(pathId);
  console.log(`    Completed: ${pathId} (${completedPaths.size}/${pathQueue.size})`);
}

/**
 * Get current queue status
 */
export function getStatus(): QueueStatus {
  const total = pathQueue.size;
  const completed = completedPaths.size;
  const remaining = total - completed;

  // Find next unprocessed path
  let nextPath: string | null = null;
  for (const pathId of processingOrder) {
    if (!completedPaths.has(pathId)) {
      nextPath = pathId;
      break;
    }
  }

  return {
    total,
    completed,
    remaining,
    nextPath
  };
}

/**
 * Clear all queue data
 * Called at end of planning phase or on error
 */
export function clearQueue(): void {
  const count = pathQueue.size;
  pathQueue.clear();
  processingOrder = [];
  completedPaths.clear();

  if (count > 0) {
    console.log(`   =�  Cleared queue (${count} paths)`);
  }
}

/**
 * Get all paths (for debugging/inspection)
 */
export function getAllPaths(): SubflowPath[] {
  return Array.from(pathQueue.values());
}

/**
 * Check if path exists in queue
 */
export function hasPath(pathId: string): boolean {
  return pathQueue.has(pathId);
}

/**
 * Check if path is completed
 */
export function isCompleted(pathId: string): boolean {
  return completedPaths.has(pathId);
}
