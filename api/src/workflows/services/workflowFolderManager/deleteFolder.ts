import { getFirestore } from 'firebase-admin/firestore';

export const deleteFolder = async (
  tenantId: string,
  folderId: string
): Promise<boolean> => {
  const db = getFirestore();

  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflowFolders')
    .doc(folderId);

  const doc = await docRef.get();
  if (!doc.exists) {
    return false;
  }

  // First, set all workflows in this folder to have no folder (folderId = null)
  const workflowsSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .where('folderId', '==', folderId)
    .get();

  // Update all workflows to remove folder reference
  const batch = db.batch();
  workflowsSnapshot.forEach((workflowDoc) => {
    batch.update(workflowDoc.ref, { folderId: null });
  });

  // Commit the batch update
  await batch.commit();

  // Now delete the folder
  await docRef.delete();
  return true;
};
