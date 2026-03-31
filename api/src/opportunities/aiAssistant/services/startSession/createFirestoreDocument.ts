import { db } from '../../../../config/firestore';
import { v4 as uuidv4 } from 'uuid';

export interface AISessionData {
  sessionId: string;
  tenantId: string;
  pipelineId: string;
  status: 'active' | 'completed' | 'failed';
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  messageCount: number;
  firstUserMessage: string;
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
  metadata: {
    toolsAvailable?: boolean;
    currentStage?: string;
    stagesGenerated?: boolean;
    stageCount?: number;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export async function createFirestoreDocument(
  tenantId: string, 
  pipelineId: string,
  initialPrompt: string,
  pipelineData?: {
    name: string;
    isNew: boolean;
    existingStages?: Array<{
      id: string;
      name: string;
      order: number;
      dateCreated: string;
      lastModified: string;
      color?: string;
    }>;
  }
): Promise<string> {
  try {
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    
    console.log('=� Creating Firestore document for AI session...');
    console.log('=� Session ID:', sessionId);
    console.log('=� Tenant ID:', tenantId);
    console.log('=� Pipeline ID:', pipelineId);

    // Create the session document data
    const sessionData: AISessionData = {
      sessionId,
      tenantId,
      pipelineId,
      status: 'active',
      messages: [
        {
          role: 'user',
          content: initialPrompt,
          timestamp: now
        }
      ],
      messageCount: 1,
      firstUserMessage: initialPrompt,
      pipeline: {
        id: pipelineId,
        name: pipelineData?.name || 'AI Generated Pipeline',
        isNew: pipelineData?.isNew ?? true,
        dateCreated: now,
        lastModified: now
      },
      stages: pipelineData?.existingStages || [],
      metadata: {
        toolsAvailable: false,
        currentStage: 'analysis',
        stagesGenerated: false,
        stageCount: pipelineData?.existingStages?.length || 0
      },
      createdAt: now,
      updatedAt: now
    };

    // Create document at: tenants/{tenantId}/pipelines/main/aiAssistant/sessions/{sessionId}
    const sessionRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('pipelines')
      .doc('main')
      .collection('aiAssistant')
      .doc('main')
      .collection('sessions')
      .doc(sessionId);

    await sessionRef.set(sessionData);

    console.log(' AI session document created successfully');
    return sessionId;
  } catch (error) {
    console.error('L Error creating AI session document:', error);
    throw new Error(`Failed to create AI session document: ${(error as Error).message}`);
  }
}