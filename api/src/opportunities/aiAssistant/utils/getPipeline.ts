import { db } from '../../../config/firestore';
import { AISessionData } from '../services/startSession/createFirestoreDocument';

export interface SessionPipelineData {
  pipeline: {
    id: string;
    name: string;
    isNew: boolean;
    dateCreated?: string;
    lastModified?: string;
  };
  stages: Array<{
    id: string;
    name: string;
    order: number;
    dateCreated: string;
    lastModified: string;
    color?: string;
  }>;
}

export async function getPipelineFromSession(tenantId: string, sessionId: string): Promise<SessionPipelineData> {
  try {
    console.log('📋 Getting pipeline data from session:', sessionId);
    
    // Get session document which contains pipeline and stages data
    const sessionRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('pipelines')
      .doc('main')
      .collection('aiAssistant')
      .doc('main')
      .collection('sessions')
      .doc(sessionId);
    
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      throw new Error(`AI session ${sessionId} not found`);
    }
    
    const sessionData = sessionDoc.data() as AISessionData;
    
    console.log('📋 Found pipeline:', sessionData.pipeline.name);
    console.log('📋 Found', sessionData.stages.length, 'stages in session');
    
    sessionData.stages.forEach((stage, index) => {
      console.log(`📋 Stage ${index + 1}: ${stage.name} (order: ${stage.order})`);
    });
    
    return {
      pipeline: sessionData.pipeline,
      stages: sessionData.stages
    };
  } catch (error) {
    console.error('❌ Error getting pipeline from session:', error);
    throw new Error(`Failed to get pipeline from session: ${(error as Error).message}`);
  }
}

// Legacy function kept for backward compatibility but now redirects to session-based approach
export async function getPipeline(tenantId: string, pipelineId: string): Promise<any> {
  console.warn('⚠️ getPipeline is deprecated. Use getPipelineFromSession instead.');
  throw new Error('getPipeline is deprecated. Use getPipelineFromSession with sessionId instead.');
}