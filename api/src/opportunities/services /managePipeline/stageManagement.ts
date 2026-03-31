import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../config/firestore';
import { FullStageData } from '../../types/pipelineTypes';

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

// Helper function to reorder stages
async function reorderStages(tenantId: string, pipelineId: string, movedStageId: string, oldOrder: number, newOrder: number) {
  const pipelineRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}`);
  const batch = db.batch();
  
  if (oldOrder < newOrder) {
    // Moving down: decrease order of stages between old and new position
    const affectedStages = await pipelineRef
      .collection('pipelineStages')
      .where('order', '>', oldOrder)
      .where('order', '<=', newOrder)
      .get();
    
    affectedStages.docs.forEach((doc) => {
      if (doc.id !== movedStageId) {
        batch.update(doc.ref, {
          order: doc.data().order - 1,
          lastModified: new Date().toISOString()
        });
      }
    });
  } else {
    // Moving up: increase order of stages between new and old position
    const affectedStages = await pipelineRef
      .collection('pipelineStages')
      .where('order', '>=', newOrder)
      .where('order', '<', oldOrder)
      .get();
    
    affectedStages.docs.forEach((doc) => {
      if (doc.id !== movedStageId) {
        batch.update(doc.ref, {
          order: doc.data().order + 1,
          lastModified: new Date().toISOString()
        });
      }
    });
  }
  
  await batch.commit();
}

export const stageManagement = {
  // Create a new stage within a pipeline
  async createStage(tenantId: string, pipelineId: string, stageData: { name: string; order?: number }) {
    const stageId = uuidv4();
    const now = new Date().toISOString();
    
    // Get the pipeline reference to ensure it exists
    const pipelineRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}`);
    const pipelineDoc = await pipelineRef.get();
    
    if (!pipelineDoc.exists) {
      throw new Error('Pipeline not found');
    }
    
    // If no order is provided, get the count of existing stages
    let order = stageData.order;
    if (order === undefined) {
      const stagesSnapshot = await pipelineRef.collection('pipelineStages').get();
      order = stagesSnapshot.size;
    }
    
    const newStageData: FullStageData = {
      id: stageId,
      name: stageData.name,
      order: order,
      dateCreated: now,
      lastModified: now,
      opportunityCount: 0,
      totalValue: 0,
      color: generateStageColor(order)
    };
    
    // Create the stage document
    const stageRef = pipelineRef.collection('pipelineStages').doc(stageId);
    await stageRef.set(newStageData);
    
    return newStageData;
  },
  
  // Delete a stage from a pipeline
  async deleteStage(tenantId: string, pipelineId: string, stageId: string) {
    const stageRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}/pipelineStages/${stageId}`);
    
    // Verify the stage exists
    const stageDoc = await stageRef.get();
    if (!stageDoc.exists) {
      throw new Error('Stage not found');
    }
    
    const deletedStageOrder = stageDoc.data()?.order || 0;
    
    // Delete the stage
    await stageRef.delete();
    
    // Update the order of remaining stages
    const pipelineRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}`);
    const remainingStagesSnapshot = await pipelineRef
      .collection('pipelineStages')
      .where('order', '>', deletedStageOrder)
      .get();
    
    const batch = db.batch();
    remainingStagesSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        order: doc.data().order - 1,
        lastModified: new Date().toISOString()
      });
    });
    
    await batch.commit();
    
    // TODO: Handle opportunities in this stage (move to another stage or archive)
  },
  
  // Update a stage
  async updateStage(tenantId: string, pipelineId: string, stageId: string, updateData: Partial<{ name: string; order: number }>) {
    const stageRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}/pipelineStages/${stageId}`);
    
    // Verify the stage exists
    const stageDoc = await stageRef.get();
    if (!stageDoc.exists) {
      throw new Error('Stage not found');
    }
    
    const currentData = stageDoc.data() as FullStageData;
    
    // If order is being changed, we need to reorder other stages
    if (updateData.order !== undefined && updateData.order !== currentData.order) {
      await reorderStages(tenantId, pipelineId, stageId, currentData.order, updateData.order);
    }
    
    // Update the stage
    const updates = {
      ...updateData,
      lastModified: new Date().toISOString()
    };
    
    await stageRef.update(updates);
    
    return { ...currentData, ...updates, id: stageId };
  }
};