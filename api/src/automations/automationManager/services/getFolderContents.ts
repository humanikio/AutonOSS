import { db } from '../../../config/firestore';
import { AutomationData } from './createAutomation';

export const getFolderContentsService = async (tenantId: string, folderId: string): Promise<AutomationData[]> => {
  try {
    // Get all automation links for this folder
    const folderAutomationsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('folders')
      .doc(folderId)
      .collection('automations');

    const automationLinksSnapshot = await folderAutomationsRef.get();
    
    if (automationLinksSnapshot.empty) {
      console.log(`✅ No automations found in folder ${folderId} for tenant ${tenantId}`);
      return [];
    }

    // Get the automation IDs from the links
    const automationIds = automationLinksSnapshot.docs.map(doc => doc.id);

    // Fetch the full automation data for each ID
    const automationsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations');

    const automationPromises = automationIds.map(id => automationsRef.doc(id).get());
    const automationDocs = await Promise.all(automationPromises);

    const automations: AutomationData[] = [];
    automationDocs.forEach(doc => {
      if (doc.exists) {
        automations.push(doc.data() as AutomationData);
      }
    });

    // Sort by updatedAt desc
    automations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    console.log(`✅ Retrieved ${automations.length} automations from folder ${folderId} for tenant ${tenantId}`);
    
    return automations;
  } catch (error) {
    console.error('Error fetching folder contents from Firestore:', error);
    throw new Error(`Failed to fetch folder contents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};