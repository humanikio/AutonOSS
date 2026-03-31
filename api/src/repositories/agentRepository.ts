import { firestore } from '../config/firebase';
import { CallAgent, CallAgentRequest } from '@/types';

export class AgentRepository {
  private static readonly COLLECTION = 'callAgents';

  // Get all call agents for a tenant
  static async getCallAgents(tenantId: string): Promise<CallAgent[]> {
    const agentsSnapshot = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();

    return agentsSnapshot.docs.map(doc => doc.data() as CallAgent);
  }

  // Get a specific call agent by ID
  static async getCallAgent(tenantId: string, agentId: string): Promise<CallAgent | null> {
    const agentDoc = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .doc(agentId)
      .get();

    if (!agentDoc.exists) {
      return null;
    }

    return agentDoc.data() as CallAgent;
  }

  // Create a new call agent
  static async createCallAgent(tenantId: string, agentData: CallAgent): Promise<CallAgent> {
    await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .doc(agentData.id)
      .set(agentData);

    return agentData;
  }

  // Update a call agent
  static async updateCallAgent(tenantId: string, agentId: string, agentData: CallAgent): Promise<CallAgent> {
    const agentRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .doc(agentId);

    await agentRef.set(agentData);
    return agentData;
  }

  // Partially update a call agent
  static async updateCallAgentFields(tenantId: string, agentId: string, fields: Partial<CallAgent>): Promise<void> {
    const agentRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .doc(agentId);

    await agentRef.update(fields);
  }

  // Delete a call agent
  static async deleteCallAgent(tenantId: string, agentId: string): Promise<void> {
    await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .doc(agentId)
      .delete();
  }

  // Check if a call agent exists
  static async agentExists(tenantId: string, agentId: string): Promise<boolean> {
    const agentDoc = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .doc(agentId)
      .get();

    return agentDoc.exists;
  }

  // Get agents by status
  static async getCallAgentsByStatus(tenantId: string, status: string): Promise<CallAgent[]> {
    const agentsSnapshot = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection(this.COLLECTION)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    return agentsSnapshot.docs.map(doc => doc.data() as CallAgent);
  }

  // Generate new agent ID
  static generateAgentId(): string {
    return firestore.collection('temp').doc().id;
  }
}