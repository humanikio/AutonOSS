import { firestore } from '../../../config/firebase';

export interface Agent {
  id: string;
  name?: string;
  status: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  totalInteractions?: number;
}

export async function getAgentsService(tenantId: string): Promise<Agent[]> {
  try {
    const agentsRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents');
    
    const snapshot = await agentsRef.get();
    
    if (snapshot.empty) {
      return [];
    }
    
    const agents: Agent[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      agents.push({
        id: doc.id,
        name: data.name || 'Unnamed Agent',
        status: data.status || 'draft',
        description: data.description || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        lastActive: data.lastActive,
        totalInteractions: data.totalInteractions || 0,
      });
    });
    
    // Sort by createdAt descending (newest first)
    agents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return agents;
  } catch (error) {
    console.error('Error fetching agents from Firestore:', error);
    throw new Error(`Failed to fetch agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}