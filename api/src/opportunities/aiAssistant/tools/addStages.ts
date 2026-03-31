import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../config/firestore';
import { AISessionData } from '../services/startSession/createFirestoreDocument';

export interface StageToCreate {
  name: string;
  order: number;
}

export interface SessionStage {
  id: string;
  name: string;
  order: number;
  dateCreated: string;
  lastModified: string;
  color?: string;
}

export interface AddStagesResult {
  success: boolean;
  createdStages: SessionStage[];
  totalStages: number;
}

// Helper function to generate stage colors
function generateStageColor(order: number): string {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#F97316', // Orange
  ];
  
  return colors[order % colors.length];
}

export async function addStages(
  tenantId: string,
  sessionId: string,
  stagesToCreate: StageToCreate[]
): Promise<AddStagesResult> {
  try {
    console.log('🔨 Adding stages to session:', sessionId);
    console.log('🔨 Stages to create:', stagesToCreate.length);
    
    // Get session document
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
    const now = new Date().toISOString();
    
    // Sort stages by order to create them in the correct sequence
    const sortedStages = [...stagesToCreate].sort((a, b) => a.order - b.order);
    
    const createdStages: SessionStage[] = [];
    
    // Create each stage object
    for (const stage of sortedStages) {
      console.log(`🔨 Creating stage: ${stage.name} (order: ${stage.order})`);
      
      const newStage: SessionStage = {
        id: uuidv4(),
        name: stage.name,
        order: stage.order,
        dateCreated: now,
        lastModified: now,
        color: generateStageColor(stage.order)
      };
      
      createdStages.push(newStage);
      console.log(`✅ Stage created: ${stage.name}`);
    }
    
    // Update session document with new stages
    const updatedStages = [...sessionData.stages, ...createdStages]
      .sort((a, b) => a.order - b.order); // Keep stages sorted by order
    
    // Update session metadata
    const updatedMetadata = {
      ...sessionData.metadata,
      stagesGenerated: true,
      stageCount: updatedStages.length,
      lastInteraction: now
    };
    
    // Update the session document
    await sessionRef.update({
      stages: updatedStages,
      metadata: updatedMetadata,
      updatedAt: now
    });
    
    console.log(`🔨 Successfully added ${createdStages.length} stages to session`);
    console.log(`🔨 Total stages in session: ${updatedStages.length}`);
    
    return {
      success: createdStages.length > 0,
      createdStages,
      totalStages: updatedStages.length
    };
  } catch (error) {
    console.error('❌ Error adding stages to session:', error);
    throw new Error(`Failed to add stages to session: ${(error as Error).message}`);
  }
}