import { db } from '../../../config/firestore';
import { AISessionData } from './startSession/createFirestoreDocument';
import { manageProductionPipeline } from '../tools/manageProductionPipeline';

export interface PublishPipelineResult {
  success: boolean;
  pipelineId: string;
  pipelineName: string;
  stagesCreated: number;
  stagesSkipped: number;
  totalStages: number;
  message: string;
  isNewPipeline: boolean;
}

export async function publishPipeline(
  tenantId: string,
  sessionId: string
): Promise<PublishPipelineResult> {
  try {
    console.log('=€ Publishing pipeline from session:', sessionId);

    // Step 1: Load session data
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
    console.log('=€ Loaded session data:', {
      pipelineName: sessionData.pipeline.name,
      stageCount: sessionData.stages.length,
      isNew: sessionData.pipeline.isNew
    });

    // Step 2: Validate session data
    if (!sessionData.stages || sessionData.stages.length === 0) {
      throw new Error('No stages found in session to publish');
    }

    if (!sessionData.metadata.stagesGenerated) {
      throw new Error('Session does not contain generated stages ready for publishing');
    }

    // Step 3: Use manageProductionPipeline to handle the business logic
    const result = await manageProductionPipeline(
      tenantId,
      sessionData.pipeline,
      sessionData.stages
    );

    // Step 4: Update session to mark as published
    const now = new Date().toISOString();
    await sessionRef.update({
      'metadata.published': true,
      'metadata.publishedAt': now,
      'metadata.publishedPipelineId': result.pipelineId,
      updatedAt: now
    });

    console.log('=€ Pipeline published successfully:', {
      pipelineId: result.pipelineId,
      stagesCreated: result.stagesCreated,
      isNewPipeline: result.isNewPipeline
    });

    return {
      success: true,
      pipelineId: result.pipelineId,
      pipelineName: sessionData.pipeline.name,
      stagesCreated: result.stagesCreated,
      stagesSkipped: result.stagesSkipped,
      totalStages: result.totalStages,
      isNewPipeline: result.isNewPipeline,
      message: result.isNewPipeline 
        ? `Created new pipeline "${sessionData.pipeline.name}" with ${result.stagesCreated} stages`
        : `Added ${result.stagesCreated} new stages to existing pipeline "${sessionData.pipeline.name}"`
    };

  } catch (error) {
    console.error('L Error publishing pipeline:', error);
    throw new Error(`Failed to publish pipeline: ${(error as Error).message}`);
  }
}