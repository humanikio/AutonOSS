import { db } from '../../../../config/firestore';
import { FolderData, FolderAutomationLink } from '../manageFolders';

export const editFolder = {
  // Update folder name
  updateFolderName: async (tenantId: string, folderId: string, newName: string): Promise<FolderData> => {
    try {
      const folderRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('automations')
        .doc('main')
        .collection('folders')
        .doc(folderId);

      const updatedData = {
        name: newName,
        updatedAt: new Date().toISOString()
      };

      await folderRef.update(updatedData);

      // Get the updated document
      const folderDoc = await folderRef.get();
      if (!folderDoc.exists) {
        throw new Error('Folder not found');
      }

      const folderData = folderDoc.data() as FolderData;
      console.log(` Updated folder ${folderId} name to "${newName}" for tenant ${tenantId}`);
      
      return folderData;
    } catch (error) {
      console.error('Error updating folder name:', error);
      throw new Error(`Failed to update folder name: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Add automation to folder
  addAutomationToFolder: async (tenantId: string, folderId: string, automationId: string): Promise<void> => {
    try {
      const automationLinkRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('automations')
        .doc('main')
        .collection('folders')
        .doc(folderId)
        .collection('automations')
        .doc(automationId);

      const linkData: FolderAutomationLink = {
        automationId,
        addedAt: new Date().toISOString()
      };

      await automationLinkRef.set(linkData);

      // Update folder's automation count
      const folderRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('automations')
        .doc('main')
        .collection('folders')
        .doc(folderId);

      const folderDoc = await folderRef.get();
      if (folderDoc.exists) {
        const currentCount = folderDoc.data()?.automationCount || 0;
        await folderRef.update({
          automationCount: currentCount + 1,
          updatedAt: new Date().toISOString()
        });
      }

      console.log(` Added automation ${automationId} to folder ${folderId} for tenant ${tenantId}`);
      
    } catch (error) {
      console.error('Error adding automation to folder:', error);
      throw new Error(`Failed to add automation to folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Remove automation from folder
  removeAutomationFromFolder: async (tenantId: string, folderId: string, automationId: string): Promise<void> => {
    try {
      const automationLinkRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('automations')
        .doc('main')
        .collection('folders')
        .doc(folderId)
        .collection('automations')
        .doc(automationId);

      await automationLinkRef.delete();

      // Update folder's automation count
      const folderRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('automations')
        .doc('main')
        .collection('folders')
        .doc(folderId);

      const folderDoc = await folderRef.get();
      if (folderDoc.exists) {
        const currentCount = folderDoc.data()?.automationCount || 0;
        await folderRef.update({
          automationCount: Math.max(0, currentCount - 1),
          updatedAt: new Date().toISOString()
        });
      }

      console.log(` Removed automation ${automationId} from folder ${folderId} for tenant ${tenantId}`);
      
    } catch (error) {
      console.error('Error removing automation from folder:', error);
      throw new Error(`Failed to remove automation from folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};