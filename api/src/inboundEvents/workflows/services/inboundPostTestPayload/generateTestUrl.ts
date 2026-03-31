import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

const db = admin.firestore();

export interface GenerateTestUrlResult {
  testUrl: string;
  fullUrl: string;
}

/**
 * Generate a new test URL for a workflow
 * Overwrites any existing test URL
 *
 * Firestore structure:
 * - testWebhookUrls/{url} - Root collection for scope lookup
 * - tenants/{tenantId}/workflows/{workflowId} - Update activeTestUrl field
 * - tenants/{tenantId}/workflows/{workflowId}/triggerTests/main - Metadata doc
 */
export async function generateTestUrl(
  tenantId: string,
  workflowId: string
): Promise<GenerateTestUrlResult> {
  const testUrlId = uuidv4();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  // Get API URL from environment
  const apiUrl = process.env.API_BASE_URL|| 'http://localhost:8000';
  const fullUrl = `${apiUrl}/api/workflows/inbound-events/test/${testUrlId}`;

  // Batch write to ensure atomicity
  const batch = db.batch();

  // 1. Write to root collection for scope lookup (public endpoint uses this)
  const testUrlRef = db.collection('testWebhookUrls').doc(testUrlId);
  batch.set(testUrlRef, {
    tenantId,
    workflowId,
    createdAt: timestamp,
  });

  // 2. Update workflow document with active test URL
  const workflowRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId);

  batch.update(workflowRef, {
    activeTestUrl: testUrlId,
    activeTestUrlCreatedAt: timestamp,
  });

  // 3. Create/update the triggerTests/main metadata document
  const testMetadataRef = workflowRef
    .collection('triggerTests')
    .doc('main');

  batch.set(testMetadataRef, {
    activeTestUrl: testUrlId,
    fullUrl,
    createdAt: timestamp,
  }, { merge: true });

  await batch.commit();

  return {
    testUrl: testUrlId,
    fullUrl,
  };
}
