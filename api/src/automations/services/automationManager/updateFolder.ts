import { UpdateFolderData } from '../types';
import { updateFolderInFirestore } from '../../utils/syncAutomationFirestore';

export const updateFolder = async (
  tenantId: string,
  folderId: string,
  updateData: UpdateFolderData
): Promise<void> => {
  try {
    console.log(`Updating automation folder ${folderId} for tenant ${tenantId}`);

    // Update folder in Firestore
    await updateFolderInFirestore(tenantId, folderId, updateData);

    console.log(`Automation folder updated: ${folderId}`);

  } catch (error) {
    console.error('Error updating automation folder:', error);
    throw new Error(`Failed to update automation folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
