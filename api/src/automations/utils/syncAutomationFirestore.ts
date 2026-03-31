import admin from 'firebase-admin';
import { AutomationWorkflow, AutomationFolder } from '../services/types';

// Initialize Firestore
const db = admin.firestore();

/**
 * Create a new automation workflow in Firestore
 * Path: tenants/{tenantId}/automations/main/workflows/{workflowId}
 */
export const createWorkflowInFirestore = async (
  tenantId: string,
  workflowData: Partial<AutomationWorkflow>
): Promise<AutomationWorkflow> => {
  try {
    console.log(`Creating workflow in Firestore for tenant ${tenantId}`);

    // Generate workflow ID using Firestore auto-ID
    const workflowRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('workflows')
      .doc();

    const workflowId = workflowRef.id;
    const timestamp = admin.firestore.Timestamp.now();

    const firestoreData: AutomationWorkflow = {
      workflowId,
      n8nWorkflowId: workflowData.n8nWorkflowId,
      name: workflowData.name || `New Workflow ${new Date().toLocaleString()}`,
      status: workflowData.status || 'draft',
      totalEnrolled: workflowData.totalEnrolled || 0,
      activeEnrolled: workflowData.activeEnrolled || 0,
      tenantId,
      createdAt: timestamp.toDate().toISOString(),
      updatedAt: timestamp.toDate().toISOString()
    };

    await workflowRef.set(firestoreData);

    console.log(`Workflow created in Firestore: ${workflowId}`);
    return firestoreData;

  } catch (error) {
    console.error('Error creating workflow in Firestore:', error);
    throw new Error(`Failed to create workflow in Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get a single workflow from Firestore
 * Path: tenants/{tenantId}/automations/main/workflows/{workflowId}
 */
export const getWorkflowFromFirestore = async (
  tenantId: string,
  workflowId: string
): Promise<AutomationWorkflow | null> => {
  try {
    const workflowRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('workflows')
      .doc(workflowId);

    const doc = await workflowRef.get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as AutomationWorkflow;

  } catch (error) {
    console.error('Error getting workflow from Firestore:', error);
    throw new Error(`Failed to get workflow from Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get all workflows for a tenant
 * Path: tenants/{tenantId}/automations/main/workflows
 */
export const getAllWorkflowsFromFirestore = async (
  tenantId: string
): Promise<AutomationWorkflow[]> => {
  try {
    const workflowsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('workflows');

    const snapshot = await workflowsRef.get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => doc.data() as AutomationWorkflow);

  } catch (error) {
    console.error('Error getting workflows from Firestore:', error);
    throw new Error(`Failed to get workflows from Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Update an existing workflow in Firestore
 * Path: tenants/{tenantId}/automations/main/workflows/{workflowId}
 */
export const updateWorkflowInFirestore = async (
  tenantId: string,
  workflowId: string,
  updateData: Partial<AutomationWorkflow>
): Promise<void> => {
  try {
    console.log(`Updating workflow in Firestore: ${workflowId}`);

    const workflowRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('workflows')
      .doc(workflowId);

    const doc = await workflowRef.get();
    if (!doc.exists) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const timestamp = admin.firestore.Timestamp.now();
    const updates = {
      ...updateData,
      updatedAt: timestamp.toDate().toISOString()
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof typeof updates] === undefined) {
        delete updates[key as keyof typeof updates];
      }
    });

    await workflowRef.update(updates);

    console.log(`Workflow updated in Firestore: ${workflowId}`);

  } catch (error) {
    console.error('Error updating workflow in Firestore:', error);
    throw new Error(`Failed to update workflow in Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete a workflow from Firestore
 * Path: tenants/{tenantId}/automations/main/workflows/{workflowId}
 */
export const deleteWorkflowFromFirestore = async (
  tenantId: string,
  workflowId: string
): Promise<void> => {
  try {
    console.log(`Deleting workflow from Firestore: ${workflowId}`);

    const workflowRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('workflows')
      .doc(workflowId);

    const doc = await workflowRef.get();
    if (!doc.exists) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    await workflowRef.delete();

    console.log(`Workflow deleted from Firestore: ${workflowId}`);

  } catch (error) {
    console.error('Error deleting workflow from Firestore:', error);
    throw new Error(`Failed to delete workflow from Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Create a new folder in Firestore
 * Path: tenants/{tenantId}/automations/main/folders/{folderId}
 */
export const createFolderInFirestore = async (
  tenantId: string,
  folderName: string
): Promise<AutomationFolder> => {
  try {
    console.log(`Creating folder in Firestore for tenant ${tenantId}`);

    const folderRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('folders')
      .doc();

    const folderId = folderRef.id;
    const timestamp = admin.firestore.Timestamp.now();

    const folderData: AutomationFolder = {
      folderId,
      name: folderName,
      workflowIds: [],
      tenantId,
      createdAt: timestamp.toDate().toISOString(),
      updatedAt: timestamp.toDate().toISOString()
    };

    await folderRef.set(folderData);

    console.log(`Folder created in Firestore: ${folderId}`);
    return folderData;

  } catch (error) {
    console.error('Error creating folder in Firestore:', error);
    throw new Error(`Failed to create folder in Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get all folders for a tenant
 * Path: tenants/{tenantId}/automations/main/folders
 */
export const getAllFoldersFromFirestore = async (
  tenantId: string
): Promise<AutomationFolder[]> => {
  try {
    const foldersRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('folders');

    const snapshot = await foldersRef.get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => doc.data() as AutomationFolder);

  } catch (error) {
    console.error('Error getting folders from Firestore:', error);
    throw new Error(`Failed to get folders from Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Update a folder in Firestore
 * Path: tenants/{tenantId}/automations/main/folders/{folderId}
 */
export const updateFolderInFirestore = async (
  tenantId: string,
  folderId: string,
  updateData: Partial<AutomationFolder>
): Promise<void> => {
  try {
    console.log(`Updating folder in Firestore: ${folderId}`);

    const folderRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('folders')
      .doc(folderId);

    const doc = await folderRef.get();
    if (!doc.exists) {
      throw new Error(`Folder ${folderId} not found`);
    }

    const timestamp = admin.firestore.Timestamp.now();
    const updates = {
      ...updateData,
      updatedAt: timestamp.toDate().toISOString()
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof typeof updates] === undefined) {
        delete updates[key as keyof typeof updates];
      }
    });

    await folderRef.update(updates);

    console.log(`Folder updated in Firestore: ${folderId}`);

  } catch (error) {
    console.error('Error updating folder in Firestore:', error);
    throw new Error(`Failed to update folder in Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete a folder from Firestore
 * Path: tenants/{tenantId}/automations/main/folders/{folderId}
 */
export const deleteFolderFromFirestore = async (
  tenantId: string,
  folderId: string
): Promise<void> => {
  try {
    console.log(`Deleting folder from Firestore: ${folderId}`);

    const folderRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('automations')
      .doc('main')
      .collection('folders')
      .doc(folderId);

    const doc = await folderRef.get();
    if (!doc.exists) {
      throw new Error(`Folder ${folderId} not found`);
    }

    await folderRef.delete();

    console.log(`Folder deleted from Firestore: ${folderId}`);

  } catch (error) {
    console.error('Error deleting folder from Firestore:', error);
    throw new Error(`Failed to delete folder from Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
