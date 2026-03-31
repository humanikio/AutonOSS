import admin from 'firebase-admin';

const db = admin.firestore();

export interface LatestTestPayloadResult {
  payload: any;
  receivedAt: any;
  testUrl: string;
}

/**
 * Get the most recent test payload received for a workflow
 * Returns null if no payloads have been received
 *
 * Queries: tenants/{tenantId}/workflows/{workflowId}/triggerTests
 * Excludes the 'main' metadata document
 */
export async function getLatestTestPayload(
  tenantId: string,
  workflowId: string
): Promise<LatestTestPayloadResult | null> {
  const triggerTestsRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .collection('triggerTests');

  // Query for the latest payload, excluding the 'main' metadata doc
  // Note: We can't use != with multiple orderBy, so we fetch recent docs and filter
  const snapshot = await triggerTestsRef
    .orderBy('receivedAt', 'desc')
    .limit(10)  // Get last 10 to ensure we get at least 1 non-'main' doc
    .get();

  // Filter out the 'main' metadata doc and get the first actual payload
  const payloadDoc = snapshot.docs.find(doc => doc.id !== 'main');

  if (!payloadDoc) {
    return null;
  }

  const data = payloadDoc.data();

  return {
    payload: data.payload,
    receivedAt: data.receivedAt,
    testUrl: data.testUrl,
  };
}
