import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../config/firestore';
import { FullPipelineData, FullStageData } from '../../../types/pipelineTypes';

export interface PipelineResult {
  pipelineId: string;
  isNew: boolean;
  name: string;
  existingStages?: Array<{
    id: string;
    name: string;
    order: number;
    dateCreated: string;
    lastModified: string;
    color?: string;
  }>;
}

export async function managePipeline(tenantId: string, pipelineId?: string): Promise<PipelineResult> {
  try {
    console.log('🔧 Managing pipeline for AI session...');
    
    if (pipelineId) {
      console.log('🔧 Using existing pipeline ID:', pipelineId);
      
      // Get existing pipeline data
      const pipelineRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('pipelines')
        .doc(pipelineId);
      
      const pipelineDoc = await pipelineRef.get();
      
      if (!pipelineDoc.exists) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }
      
      const pipelineData = pipelineDoc.data() as FullPipelineData;
      
      // Get existing stages
      const stagesSnapshot = await pipelineRef
        .collection('pipelineStages')
        .orderBy('order', 'asc')
        .get();
      
      const existingStages = stagesSnapshot.docs.map(doc => {
        const stageData = doc.data() as FullStageData;
        return {
          id: stageData.id,
          name: stageData.name,
          order: stageData.order,
          dateCreated: stageData.dateCreated,
          lastModified: stageData.lastModified,
          color: stageData.color
        };
      });
      
      console.log('🔧 Found existing pipeline with', existingStages.length, 'stages');
      
      return {
        pipelineId,
        isNew: false,
        name: pipelineData.name,
        existingStages
      };
    } else {
      // Generate a new pipeline ID for the AI to work with
      const newPipelineId = uuidv4();
      console.log('🔧 Generated new pipeline ID:', newPipelineId);
      
      return {
        pipelineId: newPipelineId,
        isNew: true,
        name: 'AI Generated Pipeline',
        existingStages: []
      };
    }
  } catch (error) {
    console.error('❌ Error managing pipeline:', error);
    throw new Error(`Failed to manage pipeline: ${(error as Error).message}`);
  }
}