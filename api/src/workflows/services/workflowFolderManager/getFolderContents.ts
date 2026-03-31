import { getFirestore } from 'firebase-admin/firestore';
import { Workflow } from '../../types';

export const getFolderContents = async (
  tenantId: string,
  folderId: string
): Promise<Workflow[]> => {
  const db = getFirestore();

  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .where('folderId', '==', folderId)
    .orderBy('createdAt', 'desc')
    .get();

  const workflows: Workflow[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    workflows.push({
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    } as Workflow);
  });

  return workflows;
};
