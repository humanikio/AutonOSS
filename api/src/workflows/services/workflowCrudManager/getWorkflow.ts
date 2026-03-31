import { getFirestore } from 'firebase-admin/firestore';
import { Workflow } from '../../types';

export const getWorkflow = async (
  tenantId: string,
  workflowId: string
): Promise<Workflow | null> => {
  const db = getFirestore();

  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId);

  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  const workflow = {
    ...data,
    createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
    updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
  } as Workflow;

  // Fetch n8n config if workflow is public/synced to n8n
  try {
    const n8nConfigRef = docRef.collection('n8n').doc('config');
    const n8nConfigDoc = await n8nConfigRef.get();

    if (n8nConfigDoc.exists) {
      const n8nConfig = n8nConfigDoc.data();
      // Attach triggers array to workflow response (includes production webhook URLs)
      if (n8nConfig?.triggers) {
        workflow.triggers = n8nConfig.triggers;
      }
    }
  } catch (error) {
    console.error('Error fetching n8n config for workflow:', error);
    // Don't fail the whole request if n8n config fails to load
  }

  return workflow;
};
