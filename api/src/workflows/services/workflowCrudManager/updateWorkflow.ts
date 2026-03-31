import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Workflow, UpdateWorkflowRequest } from '../../types';
import { validateReactFlowWorkflow } from '../../../n8n/utils/convertReactFlow2N8n';
import { workflowManager } from '../../../n8n/services/workflowManager';
import { createWorkflowInFirestore, updateWorkflowInFirestore } from '../../../n8n/utils/syncN8nWorkflowFirestore';
import { getOrCreateAccountApiKey } from '../../utils/accountApiKeyHelper';
import { transformWorkflow } from '../../../n8n/transformationSystem';
import { readCompiledWorkflow } from '../../../n8n/transformationSystem/state/compiledWorkflow';
import { randomUUID } from 'crypto';
import { NodeRegistry } from '../nodeRegistry';

/**
 * Ensures all webhook/trigger nodes have stable webhook IDs
 *
 * This prevents ID drift by minting UUIDs server-side on first save.
 * Subsequent saves will reuse the existing ID.
 *
 * @param nodes - ReactFlow nodes array (mutated in place)
 * @returns The same nodes array with webhook IDs ensured
 */
const ensureWebhookIds = (nodes: any[]): any[] => {
  for (const node of nodes) {
    const nodeName = node.data?.nodeName || node.type;
    const config = NodeRegistry.getNodeConfig(nodeName);

    // Check if this is a webhook or trigger node that needs a stable ID
    const isTrigger = config?._pulseline?.isTrigger;
    const isWebhook = nodeName === 'webhook';

    if (isTrigger || isWebhook) {
      // Ensure parameters object exists
      if (!node.data.parameters) {
        node.data.parameters = {};
      }

      // Mint a stable webhook ID if not present
      if (!node.data.parameters.path) {
        const webhookId = randomUUID();
        node.data.parameters.path = webhookId;
        console.log(`🔑 Minted stable webhook ID for ${nodeName}: ${webhookId}`);
      }
    }
  }

  return nodes;
};

export const updateWorkflow = async (
  tenantId: string,
  workflowId: string,
  data: UpdateWorkflowRequest,
  userId?: string
): Promise<Workflow | null> => {
  const db = getFirestore();
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId);

  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }

  const currentWorkflow = doc.data() as Workflow;

  // Ensure webhook/trigger nodes have stable IDs before saving
  if (data.nodes) {
    ensureWebhookIds(data.nodes);
  }

  const updateData: any = {
    ...data,
    updatedAt: Timestamp.now()
  };

  // Update local workflow first (save ORIGINAL workflow without adapters)
  await docRef.update(updateData);

  const updatedDoc = await docRef.get();
  const updatedData = updatedDoc.data();
  const updatedWorkflow = {
    ...updatedData,
    createdAt: updatedData?.createdAt?.toDate?.() || updatedData?.createdAt,
    updatedAt: updatedData?.updatedAt?.toDate?.() || updatedData?.updatedAt,
  } as Workflow;

  // Debug: Log what we received
  console.log('🔍 Update workflow - Checking n8n sync conditions:', {
    isPublic: data.isPublic,
    hasNodes: !!data.nodes,
    nodesLength: data.nodes?.length,
    hasEdges: !!data.edges,
    edgesLength: data.edges?.length,
  });

  // If isPublic is true, sync to n8n
  if (data.isPublic === true && data.nodes && data.edges) {
    try {
      console.log(`🚀 Syncing workflow ${workflowId} to n8n (isPublic=true)`);

      // Get or create account API key for tenant
      let accountApiKey: string | undefined;
      if (userId) {
        try {
          accountApiKey = await getOrCreateAccountApiKey(tenantId, userId);
          console.log(`✅ Retrieved account API key for tenant ${tenantId}`);
        } catch (error) {
          console.error(`⚠️  Failed to get account API key, workflow will use placeholders:`, error);
        }
      } else {
        console.warn(`⚠️  No userId provided, workflow will use placeholders`);
      }

      // Validate ReactFlow format
      validateReactFlowWorkflow({
        name: updatedWorkflow.name,
        nodes: data.nodes!,
        edges: data.edges!
      });

      // Transform ReactFlow to n8n using NEW transformation system
      // Orchestrator handles preprocessing (custom field resolution) internally
      console.log('🔧 Using NEW transformation system...');
      const transformResult = await transformWorkflow(
        tenantId,
        workflowId,
        accountApiKey,
        {
          rawReactFlow: {
            name: updatedWorkflow.name,
            nodes: data.nodes!,
            edges: data.edges!,
            status: data.status,
          }
        }
      );

      if (!transformResult.success) {
        throw new Error(`Transformation failed: ${transformResult.error}`);
      }

      console.log(`✅ Transformation complete: ${transformResult.totalNodes} nodes created`);

      // Load compiled nodes from Firestore
      const compiledNodes = await readCompiledWorkflow(tenantId, workflowId);

      // Inject API authentication keys into nodes
      const { injectAuthenticationKey } = await import('../../../n8n/transformationSystem/utils/injectAuthenticationKey');
      const nodesWithAuth = injectAuthenticationKey(compiledNodes, accountApiKey);

      // Use connections built during compilation phase
      const connections = transformResult.connections;

      console.log('🔗 Using connections from compilation:');
      console.log(`   - Total source nodes: ${Object.keys(connections).length}`);

      // Build n8n workflow data structure
      const n8nWorkflowData = {
        name: updatedWorkflow.name,
        nodes: nodesWithAuth,
        connections,
        settings: {},
        staticData: null,
      };

      // Debug: Log the converted n8n workflow data
      console.log('📋 Compiled n8n workflow data:');
      console.log(`   - Total nodes: ${nodesWithAuth.length}`);

      // Check if n8n config exists (workflow already synced to n8n)
      const n8nConfigRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('workflows')
        .doc(workflowId)
        .collection('n8n')
        .doc('config');

      const n8nConfigDoc = await n8nConfigRef.get();
      const existingN8nConfig = n8nConfigDoc.exists ? n8nConfigDoc.data() : null;

      if (existingN8nConfig && existingN8nConfig.n8nWorkflowId) {
        // Update existing n8n workflow
        console.log(`✏️ Updating existing n8n workflow - n8n ID: ${existingN8nConfig.n8nWorkflowId}`);

        // CRITICAL: Deactivate before updating to prevent race condition
        // If we update while active, n8n may temporarily have TWO webhook handlers
        // registered (old + new), causing duplicate executions
        try {
          await workflowManager.deactivateWorkflow(existingN8nConfig.n8nWorkflowId);
          console.log(`⏸️  Deactivated workflow before update`);
        } catch (deactivationError) {
          console.error(`⚠️  Failed to deactivate workflow before update:`, deactivationError);
          // Continue anyway - update might still work
        }

        // Note: 'active' field is read-only in n8n API updates
        const n8nWorkflow = await workflowManager.updateWorkflow(existingN8nConfig.n8nWorkflowId, n8nWorkflowData, tenantId, workflowId);

        console.log(`✅ Updated n8n workflow successfully`);

        // Reactivate workflow after update
        try {
          await workflowManager.activateWorkflow(existingN8nConfig.n8nWorkflowId);
          console.log(`🟢 Reactivated workflow ${existingN8nConfig.n8nWorkflowId} after update`);
        } catch (activationError) {
          console.error(`⚠️  Failed to activate workflow, but continuing:`, activationError);
        }

        // Sync to n8n Firestore subcollection
        await updateWorkflowInFirestore(tenantId, workflowId, n8nWorkflow);

        console.log(`✅ Synced to n8n Firestore subcollection`);
      } else {
        // Create new n8n workflow
        console.log(`➕ Creating new n8n workflow`);
        const n8nWorkflow = await workflowManager.createWorkflow(n8nWorkflowData, tenantId, workflowId);

        console.log(`✅ Created n8n workflow with API ID: ${n8nWorkflow.id}`);

        // Activate the workflow so webhooks work immediately
        try {
          await workflowManager.activateWorkflow(n8nWorkflow.id);
          console.log(`🟢 Activated n8n workflow ${n8nWorkflow.id}`);
        } catch (activationError) {
          console.error(`⚠️  Failed to activate workflow, but continuing:`, activationError);
          // Don't fail the whole request if activation fails
        }

        // Sync to n8n Firestore subcollection
        await createWorkflowInFirestore(tenantId, workflowId, n8nWorkflow);

        console.log(`✅ Created n8n config in subcollection: workflows/${workflowId}/n8n/config`);
      }
    } catch (error) {
      console.error('Error syncing workflow to n8n:', error);
      // Don't fail the whole request if n8n sync fails
      // Just log the error and continue
      console.warn('Workflow saved locally but n8n sync failed');
    }
  }

  // If isPublic is explicitly set to false, we could delete from n8n here
  // (optional - for now we just don't sync)

  return updatedWorkflow;
};
