import { getFirestore } from 'firebase-admin/firestore';

/**
 * Retrieves the elevenLabsAgentId for a given agent
 * @returns elevenLabsAgentId or null if not found
 */
export async function getAgentElevenLabsId(
  tenantId: string,
  agentId: string
): Promise<string | null> {
  const db = getFirestore();

  const agentDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .get();

  if (!agentDoc.exists) {
    console.warn(`Agent not found: ${agentId}`);
    return null;
  }

  const agentData = agentDoc.data();
  const elevenLabsAgentId = agentData?.elevenLabsAgentId;

  if (!elevenLabsAgentId) {
    console.warn(`Agent ${agentId} does not have elevenLabsAgentId configured`);
    return null;
  }

  return elevenLabsAgentId;
}
