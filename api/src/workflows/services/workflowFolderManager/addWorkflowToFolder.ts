import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Workflow } from '../../types';

export const addWorkflowToFolder = async (
  tenantId: string,
  folderId: string,
  workflowId: string
): Promise<Workflow | null> => {
  const db = getFirestore();
  const workflowRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId);

  const workflowDoc = await workflowRef.get();
  if (!workflowDoc.exists) {
    return null;
  }

  await workflowRef.update({
    folderId: folderId,
    updatedAt: Timestamp.now()
  });

  const updatedDoc = await workflowRef.get();
  const updatedData = updatedDoc.data();
  return {
    ...updatedData,
    createdAt: updatedData?.createdAt?.toDate?.() || updatedData?.createdAt,
    updatedAt: updatedData?.updatedAt?.toDate?.() || updatedData?.updatedAt,
  } as Workflow;
};
