import { getFirestore } from 'firebase-admin/firestore';

/**
 * Delete n8n workflow mapping
 * Called when workflow is deleted
 */
export async function deleteWorkflowMapping(n8nWorkflowId: string): Promise<void> {
  const db = getFirestore();

  await db.collection('n8n').doc(n8nWorkflowId).delete();

  console.log(`✅ Deleted n8n workflow mapping: ${n8nWorkflowId}`);
}
