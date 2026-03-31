import { db } from '../../../../config/firestore';

export const deleteFolder = async (tenantId: string, folderId: string): Promise<void> => {
  try {
    // Delete the folder document
    const folderRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('folders')
      .doc(folderId);

    await folderRef.delete();

    // Also delete all automation links within this folder
    const automationsRef = folderRef.collection('automations');
    const automationLinksSnapshot = await automationsRef.get();
    
    const batch = db.batch();
    automationLinksSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();

    console.log(` Deleted folder ${folderId} and its automation links for tenant ${tenantId}`);
    
  } catch (error) {
    console.error('Error deleting folder from Firestore:', error);
    throw new Error(`Failed to delete folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};