import admin from 'firebase-admin';

const db = admin.firestore();

export interface TestPayloadData {
  payload: any;
  receivedAt: any;
  testUrl: string;
}

/**
 * Fetches a specific test payload from Firestore
 *
 * @param tenantId - The tenant ID
 * @param workflowId - The workflow ID
 * @param testId - The UUID of the test event to fetch
 * @returns The test payload data
 * @throws Error if test payload not found
 */
export async function getTestPayloadFirestore(
  tenantId: string,
  workflowId: string,
  testId: string
): Promise<TestPayloadData> {
  const testPayloadRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .collection('triggerTests')
    .doc(testId);

  const doc = await testPayloadRef.get();

  if (!doc.exists) {
    throw new Error(`Test payload with ID ${testId} not found`);
  }

  const data = doc.data();

  if (!data || !data.payload) {
    throw new Error(`Test payload data is invalid or missing payload field`);
  }

  return {
    payload: data.payload,
    receivedAt: data.receivedAt,
    testUrl: data.testUrl,
  };
}
