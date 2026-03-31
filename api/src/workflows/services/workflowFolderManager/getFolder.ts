import { getFirestore } from 'firebase-admin/firestore';
import { WorkflowFolder } from '../../types';

export const getFolder = async (
  tenantId: string,
  folderId: string
): Promise<WorkflowFolder | null> => {
  const db = getFirestore();

  const doc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflowFolders')
    .doc(folderId)
    .get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  return {
    ...data,
    createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
    updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
  } as WorkflowFolder;
};
