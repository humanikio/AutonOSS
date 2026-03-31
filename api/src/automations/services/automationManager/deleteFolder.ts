import { deleteFolderFromFirestore } from '../../utils/syncAutomationFirestore';

export const deleteFolder = async (
  tenantId: string,
  folderId: string
): Promise<void> => {
  try {
    console.log(`Deleting automation folder ${folderId} for tenant ${tenantId}`);

    // Delete folder from Firestore
    await deleteFolderFromFirestore(tenantId, folderId);

    console.log(`Automation folder deleted: ${folderId}`);

  } catch (error) {
    console.error('Error deleting automation folder:', error);
    throw new Error(`Failed to delete automation folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
