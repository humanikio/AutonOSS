import { getFirestore } from 'firebase-admin/firestore';

export interface WorkflowMapping {
  n8nWorkflowId: string;
  tenantId: string;
  workflowId: string;
  createdAt: any;
}

/**
 * Get workflow mapping by n8nWorkflowId
 * Returns null if not found
 */
export async function getWorkflowMapping(n8nWorkflowId: string): Promise<WorkflowMapping | null> {
  const db = getFirestore();

  const doc = await db.collection('n8n').doc(n8nWorkflowId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as WorkflowMapping;
}
