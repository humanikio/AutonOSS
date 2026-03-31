import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowFolder, CreateFolderRequest } from '../../types';

export const createFolder = async (
  tenantId: string,
  userId: string,
  data: CreateFolderRequest
): Promise<WorkflowFolder> => {
  const db = getFirestore();
  const folderId = uuidv4();

  const now = Timestamp.now();
  const folder: WorkflowFolder = {
    id: folderId,
    name: data.name,
    createdAt: now,
    updatedAt: now,
    createdBy: userId
  };

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflowFolders')
    .doc(folderId)
    .set(folder);

  // Return folder with Date objects for proper serialization
  return {
    ...folder,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  } as WorkflowFolder;
};
