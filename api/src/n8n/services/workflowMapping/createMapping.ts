import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export interface CreateMappingInput {
  n8nWorkflowId: string;
  tenantId: string;
  workflowId: string;
}

/**
 * Create reverse mapping from n8nWorkflowId to tenant/workflow
 * Allows quick resolution when n8n webhooks POST back to API
 */
export async function createWorkflowMapping(input: CreateMappingInput): Promise<void> {
  const { n8nWorkflowId, tenantId, workflowId } = input;

  const db = getFirestore();

  await db.collection('n8n').doc(n8nWorkflowId).set({
    n8nWorkflowId,
    tenantId,
    workflowId,
    createdAt: FieldValue.serverTimestamp()
  });

  console.log(`✅ Created n8n workflow mapping: ${n8nWorkflowId} → ${tenantId}/${workflowId}`);
}
