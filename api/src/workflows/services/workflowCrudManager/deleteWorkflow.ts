import { getFirestore } from 'firebase-admin/firestore';
import { workflowManager } from '../../../n8n/services/workflowManager';

export const deleteWorkflow = async (
  tenantId: string,
  workflowId: string,
  options?: { skipN8nDeletion?: boolean }
): Promise<boolean> => {
  const db = getFirestore();

  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId);

  const doc = await docRef.get();
  if (!doc.exists) {
    return false;
  }

  // Check if n8n config exists (workflow synced to n8n)
  const n8nConfigRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .collection('n8n')
    .doc('config');

  const n8nConfigDoc = await n8nConfigRef.get();
  const existingN8nConfig = n8nConfigDoc.exists ? n8nConfigDoc.data() : null;

  // If workflow exists in n8n, delete it first (unless skipN8nDeletion is true)
  if (existingN8nConfig && existingN8nConfig.n8nWorkflowId && !options?.skipN8nDeletion) {
    try {
      console.log(`🗑️  Deleting n8n workflow - n8n ID: ${existingN8nConfig.n8nWorkflowId}`);
      await workflowManager.deleteWorkflow(existingN8nConfig.n8nWorkflowId);
      console.log(`✅ Deleted n8n workflow successfully`);
    } catch (error) {
      console.error('⚠️  Error deleting workflow from n8n:', error);
      // Log the error but continue with Firestore deletion
      // This prevents orphaned Firestore docs if n8n deletion fails
    }
  } else if (options?.skipN8nDeletion && existingN8nConfig?.n8nWorkflowId) {
    console.log(`⏭️  Skipping n8n deletion (force delete) - n8n ID: ${existingN8nConfig.n8nWorkflowId}`);
  }

  // Delete Firestore document (this will cascade delete subcollections)
  await docRef.delete();
  console.log(`✅ Deleted Firestore workflow document: ${workflowId}`);

  return true;
};
