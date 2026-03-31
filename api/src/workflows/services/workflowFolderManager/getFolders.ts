import { getFirestore } from 'firebase-admin/firestore';
import { WorkflowFolder } from '../../types';

export const getFolders = async (tenantId: string): Promise<WorkflowFolder[]> => {
  const db = getFirestore();

  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflowFolders')
    .orderBy('createdAt', 'desc')
    .get();

  const folders: WorkflowFolder[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    folders.push({
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    } as WorkflowFolder);
  });

  // Count workflows for each folder
  const foldersWithCounts = await Promise.all(
    folders.map(async (folder) => {
      const workflowSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('workflows')
        .where('folderId', '==', folder.id)
        .count()
        .get();

      return {
        ...folder,
        automationCount: workflowSnapshot.data().count
      };
    })
  );

  return foldersWithCounts;
};
