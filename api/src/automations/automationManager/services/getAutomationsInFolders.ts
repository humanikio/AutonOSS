import { db } from '../../../config/firestore';

export const getAutomationsInFoldersService = async (tenantId: string): Promise<string[]> => {
  try {
    // Get all folders for the tenant
    const foldersRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('folders');

    const foldersSnapshot = await foldersRef.get();
    
    if (foldersSnapshot.empty) {
      return [];
    }

    const automationIds = new Set<string>();

    // For each folder, get all automation links
    for (const folderDoc of foldersSnapshot.docs) {
      const automationLinksRef = folderDoc.ref.collection('automations');
      const linksSnapshot = await automationLinksRef.get();
      
      linksSnapshot.docs.forEach(linkDoc => {
        automationIds.add(linkDoc.id);
      });
    }

    console.log(`✅ Found ${automationIds.size} automations in folders for tenant ${tenantId}`);
    
    return Array.from(automationIds);
  } catch (error) {
    console.error('Error fetching automations in folders:', error);
    throw new Error(`Failed to fetch automations in folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};