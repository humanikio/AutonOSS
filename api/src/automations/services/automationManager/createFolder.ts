import { CreateFolderData, AutomationFolder } from '../types';
import { createFolderInFirestore } from '../../utils/syncAutomationFirestore';

export const createFolder = async (
  tenantId: string,
  folderData: CreateFolderData
): Promise<AutomationFolder> => {
  try {
    console.log(`Creating automation folder for tenant ${tenantId}`);

    // Create folder in Firestore
    const folder = await createFolderInFirestore(tenantId, folderData.name);

    console.log(`Automation folder created: ${folder.folderId}`);
    return folder;

  } catch (error) {
    console.error('Error creating automation folder:', error);
    throw new Error(`Failed to create automation folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
