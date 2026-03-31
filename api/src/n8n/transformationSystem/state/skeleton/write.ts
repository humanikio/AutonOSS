/**
 * Skeleton Write Operations
 */

import { getFirestore } from 'firebase-admin/firestore';
import type { SessionSkeleton } from '../types';

/**
 * Save session skeleton to Firestore
 */
export async function writeSkeleton(
  tenantId: string,
  workflowId: string,
  skeleton: SessionSkeleton
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession')
    .collection('sessionSkeleton').doc('main');

  await ref.set(skeleton);
  console.log(`✅ Saved skeleton with ${skeleton.methods.length} methods`);
}

/**
 * Update status of a specific task in the skeleton
 */
export async function updateSkeletonTaskStatus(
  tenantId: string,
  workflowId: string,
  position: number,
  status: 'pending' | 'completed' | 'failed'
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession')
    .collection('sessionSkeleton').doc('main');

  const doc = await ref.get();
  if (!doc.exists) {
    throw new Error(`Skeleton not found for workflow ${workflowId}`);
  }

  const skeleton = doc.data() as SessionSkeleton;
  const taskIndex = skeleton.methods.findIndex(t => t.position === position);

  if (taskIndex === -1) {
    throw new Error(`Task at position ${position} not found in skeleton`);
  }

  skeleton.methods[taskIndex].status = status;
  await ref.update({ methods: skeleton.methods });
}

/**
 * Batch update status of multiple tasks in the skeleton
 * More efficient than individual updates - single read + single write
 */
export async function batchUpdateSkeletonStatuses(
  tenantId: string,
  workflowId: string,
  positions: number[],
  status: 'pending' | 'completed' | 'failed' = 'completed'
): Promise<void> {
  if (positions.length === 0) return;

  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession')
    .collection('sessionSkeleton').doc('main');

  const doc = await ref.get();
  if (!doc.exists) {
    throw new Error(`Skeleton not found for workflow ${workflowId}`);
  }

  const skeleton = doc.data() as SessionSkeleton;

  // Update all positions at once
  for (const pos of positions) {
    const taskIndex = skeleton.methods.findIndex(t => t.position === pos);
    if (taskIndex !== -1) {
      skeleton.methods[taskIndex].status = status;
    }
  }

  await ref.update({ methods: skeleton.methods });
  console.log(`✅ Batch updated ${positions.length} skeleton task statuses to '${status}'`);
}
