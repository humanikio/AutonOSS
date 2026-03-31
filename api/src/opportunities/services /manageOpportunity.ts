import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/firestore';
import { 
  FullOpportunityData, 
  OpportunityData, 
  CreateOpportunityRequest, 
  UpdateOpportunityRequest,
  MoveOpportunityRequest,
  OpportunityFilters,
  OpportunityListResponse,
  OpportunityStageHistory
} from '../types/opportunityTypes';
import { manageContactOpportunityService } from './manageContactOpportunity';

export const manageOpportunityService = {
  // Create a new opportunity
  async createOpportunity(tenantId: string, userId: string, opportunityData: CreateOpportunityRequest): Promise<FullOpportunityData> {
    const opportunityId = uuidv4();
    const now = new Date().toISOString();
    
    // Verify pipeline and stage exist
    const pipelineRef = db.doc(`tenants/${tenantId}/pipelines/${opportunityData.pipelineId}`);
    const pipelineDoc = await pipelineRef.get();
    
    if (!pipelineDoc.exists) {
      throw new Error('Pipeline not found');
    }
    
    const stageRef = pipelineRef.collection('pipelineStages').doc(opportunityData.stageId);
    const stageDoc = await stageRef.get();
    
    if (!stageDoc.exists) {
      throw new Error('Stage not found');
    }
    
    const stageName = stageDoc.data()?.name || 'Unknown Stage';
    
    // Create initial stage history
    const initialStageHistory: OpportunityStageHistory = {
      stageId: opportunityData.stageId,
      stageName: stageName,
      dateEntered: now
    };
    
    const newOpportunity: FullOpportunityData = {
      id: opportunityId,
      name: opportunityData.name,
      source: opportunityData.source || 'Unknown',
      value: opportunityData.value || 0,
      pipelineId: opportunityData.pipelineId,
      stageId: opportunityData.stageId,
      description: opportunityData.description,
      contactId: opportunityData.contactId,
      contactName: opportunityData.contactName,
      contactEmail: opportunityData.contactEmail,
      contactPhone: opportunityData.contactPhone,
      expectedCloseDate: opportunityData.expectedCloseDate,
      priority: opportunityData.priority || 'medium',
      tags: opportunityData.tags || [],
      dateCreated: now,
      createdBy: userId,
      lastModified: now,
      stageHistory: [initialStageHistory]
    };
    
    // Save opportunity to global collection
    const opportunityRef = db.doc(`tenants/${tenantId}/opportunities/${opportunityId}`);
    await opportunityRef.set(newOpportunity);
    
    // Create contact opportunity record if contactId is provided
    if (newOpportunity.contactId) {
      const pipelineDoc = await pipelineRef.get();
      const pipelineName = pipelineDoc.data()?.name || 'Unknown Pipeline';
      
      await manageContactOpportunityService.createContactOpportunity(
        tenantId,
        newOpportunity,
        pipelineName,
        stageName
      );
    }
    
    // Update stage counters
    await this.updateStageCounters(tenantId, opportunityData.pipelineId, opportunityData.stageId);
    
    return newOpportunity;
  },

  // Get a single opportunity
  async getOpportunity(tenantId: string, opportunityId: string): Promise<FullOpportunityData | null> {
    const opportunityRef = db.doc(`tenants/${tenantId}/opportunities/${opportunityId}`);
    const opportunityDoc = await opportunityRef.get();
    
    if (!opportunityDoc.exists) {
      return null;
    }
    
    return opportunityDoc.data() as FullOpportunityData;
  },

  // Get opportunities with filtering and pagination
  async getOpportunities(
    tenantId: string, 
    filters: OpportunityFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<OpportunityListResponse> {
    let query = db.collection(`tenants/${tenantId}/opportunities`) as any;
    
    // Apply filters
    if (filters.pipelineId) {
      query = query.where('pipelineId', '==', filters.pipelineId);
    }
    
    if (filters.stageId) {
      query = query.where('stageId', '==', filters.stageId);
    }
    
    if (filters.source) {
      query = query.where('source', '==', filters.source);
    }
    
    if (filters.priority) {
      query = query.where('priority', '==', filters.priority);
    }
    
    if (filters.minValue !== undefined) {
      query = query.where('value', '>=', filters.minValue);
    }
    
    if (filters.maxValue !== undefined) {
      query = query.where('value', '<=', filters.maxValue);
    }
    
    // Order by creation date (newest first)
    query = query.orderBy('dateCreated', 'desc');
    
    // Apply pagination
    if (offset > 0) {
      query = query.offset(offset);
    }
    
    query = query.limit(limit + 1); // Get one extra to check if there are more
    
    const snapshot = await query.get();
    const opportunities = snapshot.docs.slice(0, limit).map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as FullOpportunityData[];
    
    // Filter by search term (client-side for now, could be improved with search index)
    let filteredOpportunities = opportunities;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredOpportunities = opportunities.filter(opp => 
        opp.name.toLowerCase().includes(searchTerm) ||
        opp.description?.toLowerCase().includes(searchTerm) ||
        opp.contactName?.toLowerCase().includes(searchTerm) ||
        opp.contactEmail?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filteredOpportunities = filteredOpportunities.filter(opp => 
        opp.tags?.some(tag => filters.tags!.includes(tag))
      );
    }
    
    return {
      opportunities: filteredOpportunities,
      totalCount: filteredOpportunities.length,
      hasMore: snapshot.docs.length > limit
    };
  },

  // Update an opportunity
  async updateOpportunity(tenantId: string, opportunityId: string, updateData: UpdateOpportunityRequest): Promise<FullOpportunityData> {
    const opportunityRef = db.doc(`tenants/${tenantId}/opportunities/${opportunityId}`);
    const opportunityDoc = await opportunityRef.get();
    
    if (!opportunityDoc.exists) {
      throw new Error('Opportunity not found');
    }
    
    const currentData = opportunityDoc.data() as FullOpportunityData;
    const now = new Date().toISOString();
    const oldContactId = currentData.contactId;
    const newContactId = updateData.contactId;
    
    // If stage or pipeline is changing, validate and update counters
    if (updateData.pipelineId || updateData.stageId) {
      const newPipelineId = updateData.pipelineId || currentData.pipelineId;
      const newStageId = updateData.stageId || currentData.stageId;
      
      // Verify new pipeline and stage exist
      await this.validatePipelineAndStage(tenantId, newPipelineId, newStageId);
      
      // Update stage history if stage changed
      if (newStageId !== currentData.stageId) {
        const stageRef = db.doc(`tenants/${tenantId}/pipelines/${newPipelineId}/pipelineStages/${newStageId}`);
        const stageDoc = await stageRef.get();
        const stageName = stageDoc.data()?.name || 'Unknown Stage';
        
        // Calculate duration in previous stage
        const previousStageHistory = currentData.stageHistory[currentData.stageHistory.length - 1];
        if (previousStageHistory) {
          const durationMs = new Date(now).getTime() - new Date(previousStageHistory.dateEntered).getTime();
          const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
          previousStageHistory.durationInStage = durationDays;
        }
        
        // Add new stage history entry
        const newStageHistory: OpportunityStageHistory = {
          stageId: newStageId,
          stageName: stageName,
          dateEntered: now
        };
        
        updateData = {
          ...updateData,
          stageHistory: [...currentData.stageHistory, newStageHistory]
        };
        
        // Update counters for old and new stages
        await this.updateStageCounters(tenantId, currentData.pipelineId, currentData.stageId);
        await this.updateStageCounters(tenantId, newPipelineId, newStageId);
      }
    }
    
    const updatedData = {
      ...updateData,
      lastModified: now
    };
    
    await opportunityRef.update(updatedData);
    
    const finalOpportunityData = {
      ...currentData,
      ...updatedData,
      id: opportunityId
    } as FullOpportunityData;
    
    // Handle contact opportunity updates
    if (oldContactId !== newContactId) {
      // Contact changed - move opportunity between contacts
      if (oldContactId && newContactId) {
        // Moving from one contact to another
        const pipelineDoc = await db.doc(`tenants/${tenantId}/pipelines/${finalOpportunityData.pipelineId}`).get();
        const pipelineName = pipelineDoc.data()?.name || 'Unknown Pipeline';
        const stageDoc = await db.doc(`tenants/${tenantId}/pipelines/${finalOpportunityData.pipelineId}/pipelineStages/${finalOpportunityData.stageId}`).get();
        const stageName = stageDoc.data()?.name || 'Unknown Stage';
        
        await manageContactOpportunityService.moveOpportunityBetweenContacts(
          tenantId,
          opportunityId,
          oldContactId,
          newContactId,
          finalOpportunityData,
          pipelineName,
          stageName
        );
      } else if (oldContactId && !newContactId) {
        // Removing contact association
        await manageContactOpportunityService.deleteContactOpportunity(tenantId, opportunityId, oldContactId);
      } else if (!oldContactId && newContactId) {
        // Adding new contact association
        const pipelineDoc = await db.doc(`tenants/${tenantId}/pipelines/${finalOpportunityData.pipelineId}`).get();
        const pipelineName = pipelineDoc.data()?.name || 'Unknown Pipeline';
        const stageDoc = await db.doc(`tenants/${tenantId}/pipelines/${finalOpportunityData.pipelineId}/pipelineStages/${finalOpportunityData.stageId}`).get();
        const stageName = stageDoc.data()?.name || 'Unknown Stage';
        
        await manageContactOpportunityService.createContactOpportunity(
          tenantId,
          finalOpportunityData,
          pipelineName,
          stageName
        );
      }
    } else if (finalOpportunityData.contactId) {
      // Same contact, just update the contact opportunity record
      let pipelineName: string | undefined;
      let stageName: string | undefined;
      
      if (updateData.pipelineId || updateData.stageId) {
        const pipelineDoc = await db.doc(`tenants/${tenantId}/pipelines/${finalOpportunityData.pipelineId}`).get();
        pipelineName = pipelineDoc.data()?.name || 'Unknown Pipeline';
        const stageDoc = await db.doc(`tenants/${tenantId}/pipelines/${finalOpportunityData.pipelineId}/pipelineStages/${finalOpportunityData.stageId}`).get();
        stageName = stageDoc.data()?.name || 'Unknown Stage';
      }
      
      await manageContactOpportunityService.updateContactOpportunity(
        tenantId,
        finalOpportunityData,
        pipelineName,
        stageName
      );
    }
    
    return finalOpportunityData;
  },

  // Move opportunity to different stage/pipeline
  async moveOpportunity(tenantId: string, opportunityId: string, moveData: MoveOpportunityRequest): Promise<FullOpportunityData> {
    return await this.updateOpportunity(tenantId, opportunityId, {
      pipelineId: moveData.pipelineId,
      stageId: moveData.stageId
    });
  },

  // Delete an opportunity
  async deleteOpportunity(tenantId: string, opportunityId: string): Promise<void> {
    const opportunityRef = db.doc(`tenants/${tenantId}/opportunities/${opportunityId}`);
    const opportunityDoc = await opportunityRef.get();
    
    if (!opportunityDoc.exists) {
      throw new Error('Opportunity not found');
    }
    
    const opportunityData = opportunityDoc.data() as FullOpportunityData;
    
    // Delete contact opportunity record if exists
    if (opportunityData.contactId) {
      await manageContactOpportunityService.deleteContactOpportunity(
        tenantId,
        opportunityId,
        opportunityData.contactId
      );
    }
    
    // Delete the opportunity
    await opportunityRef.delete();
    
    // Update stage counters
    await this.updateStageCounters(tenantId, opportunityData.pipelineId, opportunityData.stageId);
  },

  // Get opportunities by stage
  async getOpportunitiesByStage(tenantId: string, pipelineId: string, stageId: string): Promise<FullOpportunityData[]> {
    const response = await this.getOpportunities(tenantId, {
      pipelineId,
      stageId
    }, 1000); // Large limit for stage view
    
    return response.opportunities;
  },

  // Bulk move opportunities
  async bulkMoveOpportunities(tenantId: string, opportunityIds: string[], moveData: MoveOpportunityRequest): Promise<void> {
    const batch = db.batch();
    const now = new Date().toISOString();
    
    // Validate pipeline and stage
    await this.validatePipelineAndStage(tenantId, moveData.pipelineId, moveData.stageId);
    
    // Get stage name for history
    const stageRef = db.doc(`tenants/${tenantId}/pipelines/${moveData.pipelineId}/pipelineStages/${moveData.stageId}`);
    const stageDoc = await stageRef.get();
    const stageName = stageDoc.data()?.name || 'Unknown Stage';
    
    for (const opportunityId of opportunityIds) {
      const opportunityRef = db.doc(`tenants/${tenantId}/opportunities/${opportunityId}`);
      const opportunityDoc = await opportunityRef.get();
      
      if (opportunityDoc.exists) {
        const currentData = opportunityDoc.data() as FullOpportunityData;
        
        // Update stage history
        const previousStageHistory = currentData.stageHistory[currentData.stageHistory.length - 1];
        if (previousStageHistory && previousStageHistory.stageId !== moveData.stageId) {
          const durationMs = new Date(now).getTime() - new Date(previousStageHistory.dateEntered).getTime();
          const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
          previousStageHistory.durationInStage = durationDays;
          
          const newStageHistory: OpportunityStageHistory = {
            stageId: moveData.stageId,
            stageName: stageName,
            dateEntered: now
          };
          
          batch.update(opportunityRef, {
            pipelineId: moveData.pipelineId,
            stageId: moveData.stageId,
            stageHistory: [...currentData.stageHistory, newStageHistory],
            lastModified: now
          });
        }
      }
    }
    
    await batch.commit();
    
    // Update counters (simplified - could be optimized)
    const affectedStages = new Set<string>();
    affectedStages.add(moveData.stageId);
    
    for (const stageId of affectedStages) {
      await this.updateStageCounters(tenantId, moveData.pipelineId, stageId);
    }
  },

  // Helper method to validate pipeline and stage exist
  async validatePipelineAndStage(tenantId: string, pipelineId: string, stageId: string): Promise<void> {
    const pipelineRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}`);
    const pipelineDoc = await pipelineRef.get();
    
    if (!pipelineDoc.exists) {
      throw new Error('Pipeline not found');
    }
    
    const stageRef = pipelineRef.collection('pipelineStages').doc(stageId);
    const stageDoc = await stageRef.get();
    
    if (!stageDoc.exists) {
      throw new Error('Stage not found');
    }
  },

  // Helper method to update stage counters
  async updateStageCounters(tenantId: string, pipelineId: string, stageId: string): Promise<void> {
    // Get opportunities count and total value for this stage
    const opportunitiesSnapshot = await db
      .collection(`tenants/${tenantId}/opportunities`)
      .where('pipelineId', '==', pipelineId)
      .where('stageId', '==', stageId)
      .get();
    
    const count = opportunitiesSnapshot.size;
    const totalValue = opportunitiesSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().value || 0);
    }, 0);
    
    // Update stage document
    const stageRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}/pipelineStages/${stageId}`);
    await stageRef.update({
      opportunityCount: count,
      totalValue: totalValue,
      lastModified: new Date().toISOString()
    });
    
    // Update pipeline totals
    const pipelineOpportunitiesSnapshot = await db
      .collection(`tenants/${tenantId}/opportunities`)
      .where('pipelineId', '==', pipelineId)
      .get();
    
    const pipelineCount = pipelineOpportunitiesSnapshot.size;
    const pipelineTotalValue = pipelineOpportunitiesSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().value || 0);
    }, 0);
    
    const pipelineRef = db.doc(`tenants/${tenantId}/pipelines/${pipelineId}`);
    await pipelineRef.update({
      opportunityCount: pipelineCount,
      totalValue: pipelineTotalValue,
      lastModified: new Date().toISOString()
    });
  }
};