import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Process a new test payload received at the public webhook
 *
 * Flow:
 * 1. Look up scope (tenantId, workflowId) from testWebhookUrls/{url}
 * 2. Store payload in tenants/{tenantId}/workflows/{workflowId}/triggerTests/{UUID}
 * 3. Return success
 *
 * @throws Error if URL is not found or invalid
 */
export async function processNewRequest(url: string, payload: any): Promise<void> {
  // 1. Look up the scope from the root collection
  const testUrlRef = db.collection('testWebhookUrls').doc(url);
  const testUrlDoc = await testUrlRef.get();

  if (!testUrlDoc.exists) {
    throw new Error('Invalid or expired test URL');
  }

  const { tenantId, workflowId } = testUrlDoc.data() as {
    tenantId: string;
    workflowId: string;
  };

  if (!tenantId || !workflowId) {
    throw new Error('Invalid test URL configuration');
  }

  // 2. Store the payload in the triggerTests subcollection
  const payloadId = uuidv4();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  const payloadRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .collection('triggerTests')
    .doc(payloadId);

  await payloadRef.set({
    payload,
    receivedAt: timestamp,
    testUrl: url,
  });

  console.log(`Test payload received for workflow ${workflowId} (tenant: ${tenantId})`);
}
