import admin from 'firebase-admin';

// Initialize Firestore
const db = admin.firestore();

/**
 * Resolves a local workflow ID to its corresponding n8n workflow ID
 * Path: tenants/{tenantId}/workflows/{workflowId}/n8n/config
 *
 * @param tenantId - The tenant ID
 * @param workflowId - Our internal workflow ID (Firestore document ID)
 * @returns The n8n workflow ID stored in the document
 * @throws Error if workflow not found or n8n ID is missing
 */
export const resolveN8nWorkflowId = async (
  tenantId: string,
  workflowId: string
): Promise<string> => {
  try {
    console.log(`Resolving n8n workflow ID for workflowId: ${workflowId}, tenantId: ${tenantId}`);

    const configRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('workflows')
      .doc(workflowId)
      .collection('n8n')
      .doc('config');

    const doc = await configRef.get();

    if (!doc.exists) {
      throw new Error(`n8n config not found for workflow ${workflowId}. Make sure the workflow is synced to n8n (Public toggle enabled).`);
    }

    const data = doc.data();
    const n8nWorkflowId = data?.n8nWorkflowId;

    if (!n8nWorkflowId) {
      throw new Error(`n8n workflow ID not found in config for workflow ${workflowId}`);
    }

    console.log(`Resolved n8n workflow ID: ${n8nWorkflowId}`);
    return n8nWorkflowId;

  } catch (error) {
    console.error('Error resolving n8n workflow ID:', error);
    throw error;
  }
};
