import { db } from '../../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { AgentCycle } from './createCycle';

export interface UpdateCycleData {
  status?: 'active' | 'completed' | 'failed';
  prompt?: string;
  chatId?: string; // Update associated chat ID
  completedTasks?: string[]; // Replace entire array
  addCompletedTask?: string; // Add single task to array
  brainThinkingComplete?: boolean;
  currentActivity?: 'brain_thinking' | 'generating_image' | 'generating_html' | 'awaiting_clarification' | null;
  currentActivityLabel?: string | null;
}

/**
 * Update an agent cycle
 */
export async function updateCycle(
  tenantId: string,
  templateId: string,
  cycleId: string,
  data: UpdateCycleData
): Promise<AgentCycle> {
  try {
    const cycleRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc(cycleId);

    // Check if cycle exists
    const cycleDoc = await cycleRef.get();
    if (!cycleDoc.exists) {
      throw new Error('Agent cycle not found');
    }

    // Build update data
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp()
    };

    if (data.status !== undefined) updateData.status = data.status;
    if (data.prompt !== undefined) updateData.prompt = data.prompt;
    if (data.chatId !== undefined) updateData.chatId = data.chatId;
    if (data.brainThinkingComplete !== undefined) updateData.brainThinkingComplete = data.brainThinkingComplete;
    if (data.currentActivity !== undefined) updateData.currentActivity = data.currentActivity;
    if (data.currentActivityLabel !== undefined) updateData.currentActivityLabel = data.currentActivityLabel;

    // Handle completedTasks updates
    if (data.completedTasks !== undefined) {
      // Replace entire array
      updateData.completedTasks = data.completedTasks;
    } else if (data.addCompletedTask) {
      // Add single task to array using arrayUnion
      updateData.completedTasks = FieldValue.arrayUnion(data.addCompletedTask);
    }

    await cycleRef.update(updateData);

    // Fetch updated document
    const updatedDoc = await cycleRef.get();
    const updatedData = updatedDoc.data();

    if (!updatedData) {
      throw new Error('Failed to retrieve updated cycle');
    }

    return {
      id: updatedDoc.id,
      tenantId: updatedData.tenantId,
      templateId: updatedData.templateId,
      chatId: updatedData.chatId,
      status: updatedData.status,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      createdBy: updatedData.createdBy,
      prompt: updatedData.prompt,
      completedTasks: updatedData.completedTasks || [],
      brainThinkingComplete: updatedData.brainThinkingComplete || false,
      currentActivity: updatedData.currentActivity || null,
      currentActivityLabel: updatedData.currentActivityLabel || null
    };
  } catch (error) {
    console.error('Error updating agent cycle:', error);
    throw error;
  }
}
