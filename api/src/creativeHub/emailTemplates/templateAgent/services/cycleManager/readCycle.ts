import { db } from '../../../../../config/firestore';
import { AgentCycle } from './createCycle';

/**
 * Read an agent cycle by ID
 */
export async function readCycle(
  tenantId: string,
  templateId: string,
  cycleId: string
): Promise<AgentCycle | null> {
  try {
    const cycleDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc(cycleId)
      .get();

    if (!cycleDoc.exists) {
      return null;
    }

    const data = cycleDoc.data();
    if (!data) {
      return null;
    }

    return {
      id: cycleDoc.id,
      tenantId: data.tenantId,
      templateId: data.templateId,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      prompt: data.prompt
    };
  } catch (error) {
    console.error('Error reading agent cycle:', error);
    throw new Error('Failed to read agent cycle');
  }
}
