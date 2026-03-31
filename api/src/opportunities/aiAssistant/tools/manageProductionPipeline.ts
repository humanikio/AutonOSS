import { db } from '../../../config/firestore';
import { managePipelineService } from '../../services /managePipelineService';
import { StageData } from '../../types/pipelineTypes';

export interface ProductionPipelineResult {
  success: boolean;
  pipelineId: string;
  stagesCreated: number;
  stagesSkipped: number;
  totalStages: number;
  isNewPipeline: boolean;
}

interface AISessionPipeline {
  id: string;
  name: string;
  isNew: boolean;
  dateCreated?: string;
  lastModified?: string;
}

interface AISessionStage {
  id: string;
  name: string;
  order: number;
  dateCreated: string;
  lastModified: string;
  color?: string;
}

export async function manageProductionPipeline(
  tenantId: string,
  pipelineInfo: AISessionPipeline,
  sessionStages: AISessionStage[]
): Promise<ProductionPipelineResult> {
  try {
    console.log('🔧 Managing production pipeline:', pipelineInfo.name);
    console.log('🔧 Pipeline is new:', pipelineInfo.isNew);
    console.log('🔧 Stages to process:', sessionStages.length);

    let pipelineId = pipelineInfo.id;
    let isNewPipeline = false;
    let stagesCreated = 0;
    let stagesSkipped = 0;

    // Check if pipeline exists in production
    const pipelineExists = await checkPipelineExists(tenantId, pipelineId);
    console.log('🔧 Pipeline exists in production:', pipelineExists);

    if (!pipelineExists) {
      // Create new pipeline in production
      console.log('🔧 Creating new production pipeline...');
      
      const newPipeline = await managePipelineService.createPipeline(
        tenantId, 
        pipelineInfo.name, 
        [] // We'll add stages separately to have better control
      );
      
      pipelineId = newPipeline.id;
      isNewPipeline = true;
      console.log('🔧 Created new pipeline with ID:', pipelineId);
    }

    // Get existing stages if pipeline already exists
    let existingStageNames: string[] = [];
    if (pipelineExists) {
      existingStageNames = await getExistingStageNames(tenantId, pipelineId);
      console.log('🔧 Existing stages:', existingStageNames);
    }

    // Add stages to the production pipeline
    console.log('🔧 Adding stages to production pipeline...');
    for (const stage of sessionStages.sort((a, b) => a.order - b.order)) {
      // Check if stage with same name already exists
      if (existingStageNames.includes(stage.name)) {
        console.log(`🔧 Skipping duplicate stage: ${stage.name}`);
        stagesSkipped++;
        continue;
      }

      // Create stage in production pipeline
      const stageData: StageData = {
        name: stage.name,
        order: undefined // Let the service determine the order
      };

      await managePipelineService.createStage(tenantId, pipelineId, stageData);
      console.log(`🔧 Created stage: ${stage.name}`);
      stagesCreated++;
    }

    // Get total stages count
    const totalStages = await getTotalStagesCount(tenantId, pipelineId);

    console.log('🔧 Production pipeline management completed:', {
      pipelineId,
      stagesCreated,
      stagesSkipped,
      totalStages,
      isNewPipeline
    });

    return {
      success: true,
      pipelineId,
      stagesCreated,
      stagesSkipped,
      totalStages,
      isNewPipeline
    };

  } catch (error) {
    console.error('L Error managing production pipeline:', error);
    throw new Error(`Failed to manage production pipeline: ${(error as Error).message}`);
  }
}

/**
 * Check if a pipeline exists in the production pipelines collection
 */
async function checkPipelineExists(tenantId: string, pipelineId: string): Promise<boolean> {
  try {
    const pipelineRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}`);
    const pipelineDoc = await pipelineRef.get();
    return pipelineDoc.exists;
  } catch (error) {
    console.error('Error checking pipeline existence:', error);
    return false;
  }
}

/**
 * Get names of existing stages in a pipeline to avoid duplicates
 */
async function getExistingStageNames(tenantId: string, pipelineId: string): Promise<string[]> {
  try {
    const stagesRef = db
      .collection(`tenants/${tenantId}/pipelines/${pipelineId}/pipelineStages`)
      .orderBy('order', 'asc');
    
    const stagesSnapshot = await stagesRef.get();
    const stageNames = stagesSnapshot.docs.map(doc => doc.data().name as string);
    
    return stageNames;
  } catch (error) {
    console.error('Error getting existing stage names:', error);
    return [];
  }
}

/**
 * Get total count of stages in a pipeline
 */
async function getTotalStagesCount(tenantId: string, pipelineId: string): Promise<number> {
  try {
    const stagesRef = db.collection(`tenants/${tenantId}/pipelines/${pipelineId}/pipelineStages`);
    const stagesSnapshot = await stagesRef.get();
    return stagesSnapshot.size;
  } catch (error) {
    console.error('Error getting total stages count:', error);
    return 0;
  }
}