import admin from 'firebase-admin';
import { N8nWorkflow } from '../services/types';
import { extractTriggerMetadata, TriggerMetadata } from './extractTriggerMetadata';

// Initialize Firestore
const db = admin.firestore();

interface N8nConfigData {
  // n8n's workflow ID
  n8nWorkflowId: string;
  // Workflow details from n8n
  name: string;
  active: boolean;
  // Serialized as JSON strings to avoid Firestore nested array limitations
  nodesJson: string;
  connectionsJson: string;
  settings?: Record<string, any>;
  tags?: string[];
  // Trigger metadata (webhooks, schedules, etc.)
  triggers: TriggerMetadata[];
  // Timestamps
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  // n8n timestamps
  n8nCreatedAt?: string;
  n8nUpdatedAt?: string;
}

// Extended interface for return values with parsed data
interface N8nConfigDataParsed extends Omit<N8nConfigData, 'nodesJson' | 'connectionsJson'> {
  nodes: any[];
  connections: Record<string, any>;
}

/**
 * Create n8n config document in workflow subcollection
 * Path: tenants/{tenantId}/workflows/{workflowId}/n8n/config
 */
export const createWorkflowInFirestore = async (
  tenantId: string,
  workflowId: string,
  n8nWorkflowData: N8nWorkflow
): Promise<void> => {
  try {
    console.log(`📝 Syncing n8n config to Firestore for workflow ${workflowId}, n8n ID: ${n8nWorkflowData.id}`);

    // Store in workflow subcollection
    const configRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('workflows')
      .doc(workflowId)
      .collection('n8n')
      .doc('config');

    // Extract trigger metadata (webhooks, schedules, etc.)
    const triggers = extractTriggerMetadata(n8nWorkflowData.nodes || []);

    const configData: N8nConfigData = {
      n8nWorkflowId: n8nWorkflowData.id,
      name: n8nWorkflowData.name,
      active: n8nWorkflowData.active,
      // Serialize nodes and connections to avoid Firestore nested array limitations
      nodesJson: JSON.stringify(n8nWorkflowData.nodes || []),
      connectionsJson: JSON.stringify(n8nWorkflowData.connections || {}),
      settings: n8nWorkflowData.settings,
      tags: n8nWorkflowData.tags,
      triggers: triggers,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      n8nCreatedAt: n8nWorkflowData.createdAt,
      n8nUpdatedAt: n8nWorkflowData.updatedAt
    };

    await configRef.set(configData);

    console.log(`✅ n8n config synced to: workflows/${workflowId}/n8n/config`);
    console.log(`   - n8n ID: ${n8nWorkflowData.id}`);
    console.log(`   - Triggers: ${triggers.length}`);

  } catch (error) {
    console.error('❌ Error creating n8n config in Firestore:', error);
    throw new Error(`Failed to sync n8n config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Update n8n config document in workflow subcollection
 * Path: tenants/{tenantId}/workflows/{workflowId}/n8n/config
 */
export const updateWorkflowInFirestore = async (
  tenantId: string,
  workflowId: string,
  n8nWorkflowData: N8nWorkflow
): Promise<void> => {
  try {
    console.log(`📝 Updating n8n config in Firestore: workflow ${workflowId}`);

    const configRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('workflows')
      .doc(workflowId)
      .collection('n8n')
      .doc('config');

    // Check if document exists
    const doc = await configRef.get();
    if (!doc.exists) {
      console.warn(`⚠️  n8n config not found, creating new config for workflow ${workflowId}`);
      // If config doesn't exist, create it
      await createWorkflowInFirestore(tenantId, workflowId, n8nWorkflowData);
      return;
    }

    // Extract trigger metadata
    const triggers = extractTriggerMetadata(n8nWorkflowData.nodes || []);

    const updateData = {
      name: n8nWorkflowData.name,
      active: n8nWorkflowData.active,
      // Serialize nodes and connections to avoid Firestore nested array limitations
      nodesJson: JSON.stringify(n8nWorkflowData.nodes || []),
      connectionsJson: JSON.stringify(n8nWorkflowData.connections || {}),
      settings: n8nWorkflowData.settings,
      tags: n8nWorkflowData.tags,
      triggers: triggers,
      updatedAt: admin.firestore.Timestamp.now(),
      n8nUpdatedAt: n8nWorkflowData.updatedAt
    };

    await configRef.update(updateData);

    console.log(`✅ n8n config updated: workflows/${workflowId}/n8n/config`);
    console.log(`   - Triggers: ${triggers.length}`);

  } catch (error) {
    console.error('❌ Error updating n8n config in Firestore:', error);
    throw new Error(`Failed to update n8n config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete n8n config document from workflow subcollection
 * Path: tenants/{tenantId}/workflows/{workflowId}/n8n/config
 */
export const deleteWorkflowFromFirestore = async (
  tenantId: string,
  workflowId: string
): Promise<void> => {
  try {
    console.log(`🗑️  Deleting n8n config from Firestore: workflow ${workflowId}`);

    const configRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('workflows')
      .doc(workflowId)
      .collection('n8n')
      .doc('config');

    // Check if document exists
    const doc = await configRef.get();
    if (!doc.exists) {
      console.warn(`⚠️  n8n config not found for workflow ${workflowId}`);
      return;
    }

    await configRef.delete();

    console.log(`✅ n8n config deleted: workflows/${workflowId}/n8n/config`);

  } catch (error) {
    console.error('❌ Error deleting n8n config from Firestore:', error);
    throw new Error(`Failed to delete n8n config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get n8n config for a workflow
 */
export const getWorkflowFromFirestore = async (
  tenantId: string,
  workflowId: string
): Promise<N8nConfigDataParsed | null> => {
  try {
    const configRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('workflows')
      .doc(workflowId)
      .collection('n8n')
      .doc('config');

    const doc = await configRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as N8nConfigData;

    // Parse the JSON strings back to objects
    return {
      ...data,
      nodes: JSON.parse(data.nodesJson),
      connections: JSON.parse(data.connectionsJson),
    } as N8nConfigDataParsed;

  } catch (error) {
    console.error('❌ Error getting n8n config from Firestore:', error);
    throw new Error(`Failed to get n8n config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get all n8n configs for workflows in a tenant
 * Note: This requires querying all workflows and their subcollections
 */
export const getAllWorkflowsFromFirestore = async (
  tenantId: string
): Promise<N8nConfigDataParsed[]> => {
  try {
    const workflowsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('workflows');

    const workflowDocs = await workflowsRef.get();

    if (workflowDocs.empty) {
      return [];
    }

    // Fetch n8n config for each workflow
    const configPromises = workflowDocs.docs.map(async (workflowDoc) => {
      const configRef = workflowDoc.ref.collection('n8n').doc('config');
      const configDoc = await configRef.get();
      if (!configDoc.exists) {
        return null;
      }

      const data = configDoc.data() as N8nConfigData;
      // Parse the JSON strings back to objects
      return {
        ...data,
        nodes: JSON.parse(data.nodesJson),
        connections: JSON.parse(data.connectionsJson),
      } as N8nConfigDataParsed;
    });

    const configs = await Promise.all(configPromises);
    return configs.filter((config): config is N8nConfigDataParsed => config !== null);

  } catch (error) {
    console.error('❌ Error getting n8n configs from Firestore:', error);
    throw new Error(`Failed to get n8n configs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export type { N8nConfigData, N8nConfigDataParsed };
