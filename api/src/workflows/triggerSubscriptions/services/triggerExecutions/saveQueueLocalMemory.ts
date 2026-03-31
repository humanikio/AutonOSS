/**
 * Save Queue in Local Memory
 * Simple in-memory queue for processing subscriptions
 */

import { TriggerSubscription } from '../../types';

export interface QueueItem {
  subscription: TriggerSubscription;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ExecutionQueue {
  items: QueueItem[];
  totalCount: number;
}

/**
 * Create execution queue from subscriptions
 */
export function saveQueueLocalMemory(
  subscriptions: TriggerSubscription[]
): ExecutionQueue {
  console.log(`=Â  Creating execution queue with ${subscriptions.length} subscription(s)`);

  const items: QueueItem[] = subscriptions.map(subscription => ({
    subscription,
    status: 'pending'
  }));

  return {
    items,
    totalCount: subscriptions.length
  };
}

/**
 * Mark queue item as processing
 */
export function markProcessing(queue: ExecutionQueue, index: number): void {
  if (queue.items[index]) {
    queue.items[index].status = 'processing';
  }
}

/**
 * Mark queue item as completed
 */
export function markCompleted(queue: ExecutionQueue, index: number): void {
  if (queue.items[index]) {
    queue.items[index].status = 'completed';
  }
}

/**
 * Mark queue item as failed
 */
export function markFailed(queue: ExecutionQueue, index: number, error: string): void {
  if (queue.items[index]) {
    queue.items[index].status = 'failed';
    queue.items[index].error = error;
  }
}

/**
 * Get queue summary
 */
export function getQueueSummary(queue: ExecutionQueue) {
  const completed = queue.items.filter(i => i.status === 'completed').length;
  const failed = queue.items.filter(i => i.status === 'failed').length;
  const pending = queue.items.filter(i => i.status === 'pending').length;

  return {
    total: queue.totalCount,
    completed,
    failed,
    pending
  };
}
