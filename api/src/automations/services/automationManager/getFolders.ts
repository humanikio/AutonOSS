import { AutomationFolder } from '../types';
import { getAllFoldersFromFirestore } from '../../utils/syncAutomationFirestore';

export const getFolders = async (
  tenantId: string
): Promise<AutomationFolder[]> => {
  try {
    console.log(`Fetching automation folders for tenant ${tenantId}`);

    // Get all folders from Firestore
    const folders = await getAllFoldersFromFirestore(tenantId);

    console.log(`Found ${folders.length} automation folders`);
    return folders;

  } catch (error) {
    console.error('Error fetching automation folders:', error);
    throw new Error(`Failed to fetch automation folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
