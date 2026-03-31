import { createNewPipeline } from './managePipeline/createNewPipeline';
import { deletePipeline } from './managePipeline/deletePipeline';
import { stageManagement } from './managePipeline/stageManagement';
import { db } from '../../config/firestore';
import { PipelineData, StageData } from '../types/pipelineTypes';

export const managePipelineService = {
  // Create a new pipeline with optional initial stages
  async createPipeline(tenantId: string, name: string, stages?: StageData[]) {
    // Step 1: Create the pipeline
    const pipelineData = await createNewPipeline(tenantId, name);
    
    // Step 2: Create stages if provided
    if (stages && stages.length > 0) {
      const stagePromises = stages.map((stage, index) => 
        stageManagement.createStage(tenantId, pipelineData.id, {
          ...stage,
          order: stage.order ?? index
        })
      );
      await Promise.all(stagePromises);
    }
    
    return pipelineData;
  },

  // Delete a pipeline and all its stages
  async deletePipeline(tenantId: string, pipelineId: string) {
    await deletePipeline(tenantId, pipelineId);
  },

  // Get all pipelines for a tenant
  async getPipelines(tenantId: string) {
    console.log(`🔍 Pipeline Service - Getting pipelines for tenantId: ${tenantId}`);
    const pipelinesRef = db.collection(`tenants/${tenantId}/pipelines`);
    const snapshot = await pipelinesRef.get();
    console.log(`🔍 Pipeline Service - Found ${snapshot.docs.length} pipelines for tenant ${tenantId}`);
    
    const pipelines = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const pipelineData = doc.data();
        
        // Get stages for each pipeline
        const stagesRef = pipelinesRef.doc(doc.id).collection('pipelineStages');
        const stagesSnapshot = await stagesRef.orderBy('order', 'asc').get();
        const stages = stagesSnapshot.docs.map(stageDoc => ({
          id: stageDoc.id,
          ...stageDoc.data()
        }));
        
        return {
          id: doc.id,
          ...pipelineData,
          stages
        };
      })
    );
    
    return pipelines;
  },

  // Update pipeline details
  async updatePipeline(tenantId: string, pipelineId: string, data: Partial<PipelineData>) {
    const pipelineRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}`);
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    await pipelineRef.update(updateData);
    return { id: pipelineId, ...updateData };
  },

  // Stage management methods
  async getStages(tenantId: string, pipelineId: string) {
    const stagesRef = db.collection(`tenants/${tenantId}/pipelines/${pipelineId}/pipelineStages`);
    const snapshot = await stagesRef.orderBy('order', 'asc').get();

    const stages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return stages;
  },

  async createStage(tenantId: string, pipelineId: string, stageData: StageData) {
    return await stageManagement.createStage(tenantId, pipelineId, stageData);
  },

  async deleteStage(tenantId: string, pipelineId: string, stageId: string) {
    return await stageManagement.deleteStage(tenantId, pipelineId, stageId);
  },

  async updateStage(tenantId: string, pipelineId: string, stageId: string, stageData: Partial<StageData>) {
    return await stageManagement.updateStage(tenantId, pipelineId, stageId, stageData);
  }
};