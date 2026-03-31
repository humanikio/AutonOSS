import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { validateWorkflowId } from '../../utils/validateWorkflowId';
import { create11LabsTool } from '../11LabsTools/create11LabsTool';
import { update11LabsTool } from '../11LabsTools/update11LabsTool';
import { getAgentElevenLabsId } from '../11LabsTools/getAgentElevenLabsId';
import { assignToolToAgent } from '../11LabsTools/assignToolToAgent';

export interface UpdateToolInput {
  tenantId: string;
  agentId: string;
  toolId: string;
  name?: string;
  description?: string;
  workflowId?: string;
}

export const updateTool = async (input: UpdateToolInput): Promise<void> => {
  const { tenantId, agentId, toolId, name, description, workflowId } = input;
  const db = getFirestore();

  console.log(`🔧 [UPDATE TOOL] Starting tool update for tool: ${toolId}`);
  console.log(`📝 [UPDATE TOOL] Input:`, {
    tenantId,
    agentId,
    toolId,
    hasName: name !== undefined,
    hasDescription: description !== undefined,
    hasWorkflowId: workflowId !== undefined,
    name: name || 'N/A',
    description: description || 'N/A',
    workflowId: workflowId || 'N/A',
  });

  // Fetch existing tool to check current state
  const toolRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .collection('agentTools')
    .doc(toolId);

  const toolDoc = await toolRef.get();
  if (!toolDoc.exists) {
    console.error(`❌ [UPDATE TOOL] Tool not found: ${toolId}`);
    throw new Error('Tool not found');
  }

  const existingTool = toolDoc.data();
  console.log(`📄 [UPDATE TOOL] Existing tool data:`, {
    hasName: !!existingTool?.name,
    hasDescription: !!existingTool?.description,
    existingName: existingTool?.name || 'N/A',
    existingDescription: existingTool?.description || 'N/A',
  });

  // Validate workflowId if provided
  if (workflowId !== undefined) {
    console.log(`🔍 [UPDATE TOOL] Validating workflowId: ${workflowId}`);
    const validation = await validateWorkflowId(tenantId, workflowId);
    if (!validation.isValid) {
      console.error(`❌ [UPDATE TOOL] Invalid workflowId: ${validation.error}`);
      throw new Error(validation.error || 'Invalid workflow ID');
    }
    console.log(`✅ [UPDATE TOOL] WorkflowId validated successfully`);
  }

  const updateData: Record<string, any> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (name !== undefined) {
    updateData.name = name;
  }

  if (description !== undefined) {
    updateData.description = description;
  }

  if (workflowId !== undefined) {
    updateData.workflowId = workflowId;
  }

  // Update Firestore document
  console.log(`💾 [UPDATE TOOL] Updating Firestore document for tool: ${toolId}`);
  await toolRef.update(updateData);
  console.log(`✅ [UPDATE TOOL] Firestore document updated successfully: ${toolId}`);

  // Determine final values after update
  const finalName = name !== undefined ? name : existingTool?.name;
  const finalDescription = description !== undefined ? description : existingTool?.description;

  console.log(`🔍 [UPDATE TOOL] Final values after update:`, {
    finalName: finalName || 'N/A',
    finalDescription: finalDescription || 'N/A',
    hasBoth: !!(finalName && finalDescription),
  });

  // Check if tool is already synced to 11Labs
  const elevenLabsConfigRef = toolRef.collection('11labs').doc('config');
  const elevenLabsConfigDoc = await elevenLabsConfigRef.get();
  const isAlreadySynced = elevenLabsConfigDoc.exists;

  console.log(`🔍 [UPDATE TOOL] 11Labs sync status: ${isAlreadySynced ? 'Already synced' : 'Not synced'}`);

  // Sync to 11Labs if we have both name AND description
  if (finalName && finalDescription) {
    if (isAlreadySynced) {
      // Update existing 11Labs tool
      console.log(`🔄 [UPDATE TOOL] Updating existing 11Labs tool`);
      try {
        await update11LabsTool({
          tenantId,
          agentId,
          toolId,
          name: finalName,
          description: finalDescription,
        });
        console.log(`✅ [UPDATE TOOL] Successfully updated 11Labs tool`);

        // Check if tool is assigned to agent, if not assign it
        const elevenLabsConfigData = elevenLabsConfigDoc.data();
        const isConnected = elevenLabsConfigData?.isConnectedToAgent;
        const elevenLabsToolId = elevenLabsConfigData?.elevenLabsToolId;

        if (!isConnected && elevenLabsToolId) {
          console.log(`🔗 [UPDATE TOOL] Tool exists but not assigned - attempting to assign`);
          try {
            const elevenLabsAgentId = await getAgentElevenLabsId(tenantId, agentId);
            if (elevenLabsAgentId) {
              await assignToolToAgent({
                tenantId,
                agentId,
                toolId,
                elevenLabsAgentId,
                elevenLabsToolId,
              });
              console.log(`✅ [UPDATE TOOL] Tool assigned to agent`);
            }
          } catch (assignError: any) {
            console.error(`❌ [UPDATE TOOL] Failed to assign tool to agent:`, assignError.message);
          }
        }
      } catch (error: any) {
        console.error(`❌ [UPDATE TOOL] Failed to update 11Labs tool:`, error.message);
        console.warn(`⚠️  [UPDATE TOOL] Tool updated in Firestore but not synced to 11Labs`);
      }
    } else {
      // Create new 11Labs tool (first time with complete data)
      console.log(`🚀 [UPDATE TOOL] Creating new 11Labs tool (first sync with complete data)`);
      try {
        const elevenLabsToolId = await create11LabsTool({
          tenantId,
          agentId,
          toolId,
          name: finalName,
          description: finalDescription,
        });
        console.log(`✅ [UPDATE TOOL] Successfully created 11Labs tool with ID: ${elevenLabsToolId}`);
      } catch (error: any) {
        console.error(`❌ [UPDATE TOOL] Failed to create 11Labs tool:`, error.message);
        console.warn(`⚠️  [UPDATE TOOL] Tool updated in Firestore but not synced to 11Labs`);
      }
    }
  } else {
    console.log(`⏭️  [UPDATE TOOL] Skipping 11Labs sync - missing required fields`);
    if (!finalName) console.log(`   - Missing: name`);
    if (!finalDescription) console.log(`   - Missing: description`);
  }

  console.log(`🎉 [UPDATE TOOL] Tool update completed: ${toolId}`);
};
