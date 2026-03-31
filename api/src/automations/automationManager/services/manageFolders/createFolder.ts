import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../config/firestore';
import { FolderData } from '../manageFolders';

export const createFolder = async (tenantId: string, folderName: string): Promise<FolderData> => {
  try {
    // Generate unique ID for the folder
    const folderId = uuidv4();
    
    // Create timestamp
    const timestamp = new Date().toISOString();

    // Create folder data
    const folderData: FolderData = {
      id: folderId,
      name: folderName,
      createdAt: timestamp,
      updatedAt: timestamp,
      tenantId,
      automationCount: 0
    };

    // Save to Firestore at tenants/{tenantId}/automations/main/folders/{folderId}
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('folders')
      .doc(folderId);

    await docRef.set(folderData);

    console.log(` Created folder ${folderId} for tenant ${tenantId}`);
    
    return folderData;
  } catch (error) {
    console.error('Error saving folder to Firestore:', error);
    throw new Error(`Failed to save folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};