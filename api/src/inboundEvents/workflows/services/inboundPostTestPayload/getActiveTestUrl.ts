import admin from 'firebase-admin';

const db = admin.firestore();

export interface ActiveTestUrlResult {
  testUrl: string;
  fullUrl: string;
  createdAt: any;
}

/**
 * Get the active test URL for a workflow
 * Returns null if no test URL exists
 *
 * Reads from: tenants/{tenantId}/workflows/{workflowId}/triggerTests/main
 */
export async function getActiveTestUrl(
  tenantId: string,
  workflowId: string
): Promise<ActiveTestUrlResult | null> {
  const testMetadataRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .collection('triggerTests')
    .doc('main');

  const doc = await testMetadataRef.get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();

  if (!data || !data.activeTestUrl) {
    return null;
  }

  return {
    testUrl: data.activeTestUrl,
    fullUrl: data.fullUrl,
    createdAt: data.createdAt,
  };
}
