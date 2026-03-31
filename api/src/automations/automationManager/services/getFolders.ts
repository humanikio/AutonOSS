import { db } from '../../../config/firestore';
import { FolderData } from './manageFolders';

export const getFoldersService = async (tenantId: string): Promise<FolderData[]> => {
  try {
    // Get all folders for the tenant
    const foldersRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('folders');

    const querySnapshot = await foldersRef
      .orderBy('createdAt', 'desc')
      .get();

    const folders: FolderData[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data() as FolderData;
      folders.push(data);
    });

    console.log(`✅ Retrieved ${folders.length} folders for tenant ${tenantId}`);
    
    return folders;
  } catch (error) {
    console.error('Error fetching folders from Firestore:', error);
    throw new Error(`Failed to fetch folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};