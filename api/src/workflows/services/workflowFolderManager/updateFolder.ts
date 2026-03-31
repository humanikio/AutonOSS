import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { WorkflowFolder, UpdateFolderRequest } from '../../types';

export const updateFolder = async (
  tenantId: string,
  folderId: string,
  data: UpdateFolderRequest
): Promise<WorkflowFolder | null> => {
  const db = getFirestore();
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflowFolders')
    .doc(folderId);

  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }

  const updateData: any = {
    ...data,
    updatedAt: Timestamp.now()
  };

  await docRef.update(updateData);

  const updatedDoc = await docRef.get();
  const updatedData = updatedDoc.data();
  return {
    ...updatedData,
    createdAt: updatedData?.createdAt?.toDate?.() || updatedData?.createdAt,
    updatedAt: updatedData?.updatedAt?.toDate?.() || updatedData?.updatedAt,
  } as WorkflowFolder;
};
