import { getFirestore } from 'firebase-admin/firestore';
import { AgentToolDocument } from './createTool';

export interface ListToolsInput {
  tenantId: string;
  agentId: string;
}

export const listTools = async (input: ListToolsInput): Promise<AgentToolDocument[]> => {
  const { tenantId, agentId } = input;
  const db = getFirestore();

  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .collection('agentTools')
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => doc.data() as AgentToolDocument);
};
