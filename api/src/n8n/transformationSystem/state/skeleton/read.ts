/**
 * Skeleton Read Operations
 */

import { getFirestore } from 'firebase-admin/firestore';
import type { SessionSkeleton } from '../types';

/**
 * Load session skeleton from Firestore
 */
export async function readSkeleton(
  tenantId: string,
  workflowId: string
): Promise<SessionSkeleton> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession')
    .collection('sessionSkeleton').doc('main');

  const doc = await ref.get();

  if (!doc.exists) {
    throw new Error(
      `Session skeleton not found for workflow ${workflowId}. ` +
      `Planning phase may not have completed.`
    );
  }

  return doc.data() as SessionSkeleton;
}
