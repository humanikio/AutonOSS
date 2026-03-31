import { db } from '../../../config/firestore';
import { AutomationData } from './createAutomation';
import { getAutomationsInFoldersService } from './getAutomationsInFolders';

export const getAutomationsService = async (tenantId: string): Promise<AutomationData[]> => {
  try {
    // Get all automations for the tenant
    const automationsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations');

    const querySnapshot = await automationsRef
      .orderBy('updatedAt', 'desc')
      .get();

    // Get IDs of automations that are already in folders
    const automationsInFolders = await getAutomationsInFoldersService(tenantId);
    const automationsInFoldersSet = new Set(automationsInFolders);

    const automations: AutomationData[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data() as AutomationData;
      // Only include automations that are NOT in folders
      if (!automationsInFoldersSet.has(data.id)) {
        automations.push(data);
      }
    });

    console.log(`✅ Retrieved ${automations.length} unfoldered automations for tenant ${tenantId} (${automationsInFolders.length} in folders)`);
    
    return automations;
  } catch (error) {
    console.error('Error fetching automations from Firestore:', error);
    throw new Error(`Failed to fetch automations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};