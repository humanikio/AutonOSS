import { db } from '../../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

export interface AgentCycle {
  id: string;
  tenantId: string;
  templateId: string;
  chatId?: string; // Associated chat ID for conversation tracking
  status: 'active' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  prompt?: string;
  completedTasks?: string[]; // Array of completed task IDs
  brainThinkingComplete?: boolean; // Track if brain has finished thinking
  currentActivity?: 'brain_thinking' | 'generating_image' | 'generating_html' | 'awaiting_clarification' | null;
  currentActivityLabel?: string | null; // User-friendly label for current activity
}

export interface CreateCycleData {
  prompt?: string;
  createdBy?: string;
  chatId?: string; // Optional chat ID to associate with this cycle
}

/**
 * Create a new agent cycle
 */
export async function createCycle(
  tenantId: string,
  templateId: string,
  data: CreateCycleData = {}
): Promise<AgentCycle> {
  try {
    const cycleId = uuidv4();

    const cycleRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc(cycleId);

    const now = FieldValue.serverTimestamp();

    const cycleData = {
      id: cycleId,
      tenantId,
      templateId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      completedTasks: [],
      brainThinkingComplete: false,
      ...(data.prompt && { prompt: data.prompt }),
      ...(data.createdBy && { createdBy: data.createdBy }),
      ...(data.chatId && { chatId: data.chatId })
    };

    await cycleRef.set(cycleData);

    // Update the main document to track the current active cycle and chat
    const mainRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc('main');

    const mainUpdate: any = {
      currentCycleId: cycleId,
      lastUpdated: now
    };

    // Also track currentChatId if provided
    if (data.chatId) {
      mainUpdate.currentChatId = data.chatId;
    }

    await mainRef.set(mainUpdate, { merge: true });

    // Fetch the created document to return with actual timestamps
    const doc = await cycleRef.get();
    const docData = doc.data();

    return {
      id: cycleId,
      tenantId: docData?.tenantId || tenantId,
      templateId: docData?.templateId || templateId,
      chatId: docData?.chatId,
      status: docData?.status || 'active',
      createdAt: docData?.createdAt?.toDate() || new Date(),
      updatedAt: docData?.updatedAt?.toDate() || new Date(),
      createdBy: docData?.createdBy,
      prompt: docData?.prompt,
      completedTasks: docData?.completedTasks || [],
      brainThinkingComplete: docData?.brainThinkingComplete || false,
      currentActivity: docData?.currentActivity || null,
      currentActivityLabel: docData?.currentActivityLabel || null
    };
  } catch (error) {
    console.error('Error creating agent cycle:', error);
    throw new Error('Failed to create agent cycle');
  }
}
