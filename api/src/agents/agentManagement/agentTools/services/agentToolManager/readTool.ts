import { getFirestore } from 'firebase-admin/firestore';
import { AgentToolDocument } from './createTool';

export interface ReadToolInput {
  tenantId: string;
  agentId: string;
  toolId: string;
}

export const readTool = async (input: ReadToolInput): Promise<AgentToolDocument | null> => {
  const { tenantId, agentId, toolId } = input;
  const db = getFirestore();

  const doc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .collection('agentTools')
    .doc(toolId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as AgentToolDocument;
};
