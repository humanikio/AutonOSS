/**
 * Session Metadata Update Operations
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { SessionMetadata } from '../types';

/**
 * Initialize session metadata
 */
export async function initializeSession(
  tenantId: string,
  workflowId: string,
  data: Partial<SessionMetadata>
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession');

  await ref.set({
    status: data.status || 'planning',
    startedAt: data.startedAt || Timestamp.now(),
    lastUpdatedAt: Timestamp.now(),
    totalMethods: data.totalMethods || 0,
    ...data,
  });
}

/**
 * Update session metadata
 */
export async function updateSession(
  tenantId: string,
  workflowId: string,
  updates: Partial<SessionMetadata>
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(workflowId)
    .collection('n8n').doc('buildSession');

  await ref.update({
    ...updates,
    lastUpdatedAt: Timestamp.now(),
  });
}
