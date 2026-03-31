import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { validateWorkflowId } from '../../utils/validateWorkflowId';
import { create11LabsTool } from '../11LabsTools/create11LabsTool';

export interface CreateToolInput {
  tenantId: string;
  agentId: string;
  name?: string;
  description?: string;
  workflowId?: string;
}

export interface AgentToolDocument {
  toolId: string;
  name?: string;
  description?: string;
  workflowId?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export const createTool = async (input: CreateToolInput): Promise<{ toolId: string; tool: AgentToolDocument }> => {
  const { tenantId, agentId, name, description, workflowId } = input;
  const db = getFirestore();

  console.log(`🔧 [CREATE TOOL] Starting tool creation for agent: ${agentId}`);
  console.log(`📝 [CREATE TOOL] Input:`, {
    tenantId,
    agentId,
    hasName: !!name,
    hasDescription: !!description,
    hasWorkflowId: !!workflowId,
    name: name || 'N/A',
    description: description || 'N/A',
    workflowId: workflowId || 'N/A',
  });

  // Validate workflowId if provided
  if (workflowId) {
    console.log(`🔍 [CREATE TOOL] Validating workflowId: ${workflowId}`);
    const validation = await validateWorkflowId(tenantId, workflowId);
    if (!validation.isValid) {
      console.error(`❌ [CREATE TOOL] Invalid workflowId: ${validation.error}`);
      throw new Error(validation.error || 'Invalid workflow ID');
    }
    console.log(`✅ [CREATE TOOL] WorkflowId validated successfully`);
  }

  const toolId = uuidv4();
  const timestamp = FieldValue.serverTimestamp();

  const toolData: Omit<AgentToolDocument, 'createdAt' | 'updatedAt'> & {
    createdAt: FirebaseFirestore.FieldValue;
    updatedAt: FirebaseFirestore.FieldValue;
  } = {
    toolId,
    ...(name && { name }),
    ...(description && { description }),
    ...(workflowId && { workflowId }),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Create tool document in Firestore
  console.log(`💾 [CREATE TOOL] Creating Firestore document for tool: ${toolId}`);
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .collection('agentTools')
    .doc(toolId)
    .set(toolData);

  console.log(`✅ [CREATE TOOL] Firestore document created successfully: ${toolId}`);

  // Sync to 11Labs if name AND description are provided
  if (name && description) {
    console.log(`🚀 [CREATE TOOL] Name and description provided - syncing to 11Labs`);
    try {
      const elevenLabsToolId = await create11LabsTool({
        tenantId,
        agentId,
        toolId,
        name,
        description,
      });
      console.log(`✅ [CREATE TOOL] Successfully synced to 11Labs with ID: ${elevenLabsToolId}`);
    } catch (error: any) {
      console.error(`❌ [CREATE TOOL] Failed to sync to 11Labs:`, error.message);
      // Don't throw - tool creation succeeded, 11Labs sync is optional
      console.warn(`⚠️  [CREATE TOOL] Tool created in Firestore but not synced to 11Labs`);
    }
  } else {
    console.log(`⏭️  [CREATE TOOL] Skipping 11Labs sync - missing required fields`);
    if (!name) console.log(`   - Missing: name`);
    if (!description) console.log(`   - Missing: description`);
  }

  // Return with actual timestamp for response
  const createdTool = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .collection('agentTools')
    .doc(toolId)
    .get();

  console.log(`🎉 [CREATE TOOL] Tool creation completed: ${toolId}`);

  return {
    toolId,
    tool: createdTool.data() as AgentToolDocument
  };
};
