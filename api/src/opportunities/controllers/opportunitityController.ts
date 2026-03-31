import { Request, Response } from 'express';
import { managePipelineService } from '../services /managePipelineService';
import { manageOpportunityService } from '../services /manageOpportunity';
import { 
  CreateOpportunityRequest, 
  UpdateOpportunityRequest, 
  MoveOpportunityRequest,
  OpportunityFilters 
} from '../types/opportunityTypes';
import { manageContactOpportunityService } from '../services /manageContactOpportunity';

export const opportunityController = {
  // Pipeline CRUD operations
  async createPipeline(req: Request, res: Response): Promise<void> {
    try {
      const { name, stages } = req.body;
      const tenantId = (req as any).tenantId;

      if (!name) {
        res.status(400).json({ error: 'Pipeline name is required' });
        return;
      }

      const pipelineData = await managePipelineService.createPipeline(tenantId, name, stages);
      res.status(201).json({ 
        message: 'Pipeline created successfully', 
        data: pipelineData 
      });
    } catch (error) {
      console.error('Error creating pipeline:', error);
      res.status(500).json({ error: 'Failed to create pipeline' });
    }
  },

  async deletePipeline(req: Request, res: Response) {
    try {
      const { pipelineId } = req.params;
      const tenantId = (req as any).tenantId;

      await managePipelineService.deletePipeline(tenantId, pipelineId);
      res.status(200).json({ message: 'Pipeline deleted successfully' });
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      res.status(500).json({ error: 'Failed to delete pipeline' });
    }
  },

  async getPipelines(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const pipelines = await managePipelineService.getPipelines(tenantId);
      res.status(200).json({ data: pipelines });
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      res.status(500).json({ error: 'Failed to fetch pipelines' });
    }
  },

  async updatePipeline(req: Request, res: Response) {
    try {
      const { pipelineId } = req.params;
      const { name, visibleInFunnelChart, visibleInPieChart } = req.body;
      const tenantId = (req as any).tenantId;

      const updatedData = await managePipelineService.updatePipeline(
        tenantId, 
        pipelineId, 
        { name, visibleInFunnelChart, visibleInPieChart }
      );
      res.status(200).json({ 
        message: 'Pipeline updated successfully', 
        data: updatedData 
      });
    } catch (error) {
      console.error('Error updating pipeline:', error);
      res.status(500).json({ error: 'Failed to update pipeline' });
    }
  },

  // Stage management within pipelines
  async createStage(req: Request, res: Response): Promise<void> {
    try {
      const { pipelineId } = req.params;
      const { name, order } = req.body;
      const tenantId = (req as any).tenantId;

      if (!name) {
        res.status(400).json({ error: 'Stage name is required' });
        return;
      }

      const stageData = await managePipelineService.createStage(
        tenantId, 
        pipelineId, 
        { name, order }
      );
      res.status(201).json({ 
        message: 'Stage created successfully', 
        data: stageData 
      });
    } catch (error) {
      console.error('Error creating stage:', error);
      res.status(500).json({ error: 'Failed to create stage' });
    }
  },

  async deleteStage(req: Request, res: Response) {
    try {
      const { pipelineId, stageId } = req.params;
      const tenantId = (req as any).tenantId;

      await managePipelineService.deleteStage(tenantId, pipelineId, stageId);
      res.status(200).json({ message: 'Stage deleted successfully' });
    } catch (error) {
      console.error('Error deleting stage:', error);
      res.status(500).json({ error: 'Failed to delete stage' });
    }
  },

  async getStages(req: Request, res: Response) {
    try {
      const { pipelineId } = req.params;
      const tenantId = (req as any).tenantId;

      const stages = await managePipelineService.getStages(tenantId, pipelineId);
      res.status(200).json({ data: stages });
    } catch (error) {
      console.error('Error fetching stages:', error);
      res.status(500).json({ error: 'Failed to fetch stages' });
    }
  },

  async updateStage(req: Request, res: Response) {
    try {
      const { pipelineId, stageId } = req.params;
      const { name, order } = req.body;
      const tenantId = (req as any).tenantId;

      const updatedData = await managePipelineService.updateStage(
        tenantId,
        pipelineId,
        stageId,
        { name, order }
      );
      res.status(200).json({
        message: 'Stage updated successfully',
        data: updatedData
      });
    } catch (error) {
      console.error('Error updating stage:', error);
      res.status(500).json({ error: 'Failed to update stage' });
    }
  },

  // Opportunity CRUD operations
  async createOpportunity(req: Request, res: Response): Promise<void> {
    try {
      const opportunityData: CreateOpportunityRequest = req.body;
      const tenantId = (req as any).tenantId;
      const userId = (req as any).user?.uid || 'api-key-user';

      console.log('🔍 CREATE OPPORTUNITY DEBUG - Full request body:', JSON.stringify(req.body, null, 2));
      console.log('🔍 contactId field:', {
        value: opportunityData.contactId,
        type: typeof opportunityData.contactId,
        isUndefined: opportunityData.contactId === undefined,
        isNull: opportunityData.contactId === null,
        isEmpty: opportunityData.contactId === '',
      });

      // Validate required fields
      if (!opportunityData.name || !opportunityData.pipelineId || !opportunityData.stageId) {
        res.status(400).json({
          error: 'Name, pipelineId, and stageId are required'
        });
        return;
      }

      const opportunity = await manageOpportunityService.createOpportunity(tenantId, userId, opportunityData);
      res.status(201).json({ 
        message: 'Opportunity created successfully', 
        data: opportunity 
      });
    } catch (error) {
      console.error('Error creating opportunity:', error);
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('not found')) {
        res.status(404).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: 'Failed to create opportunity' });
      }
    }
  },

  async getOpportunity(req: Request, res: Response) {
    try {
      const { opportunityId } = req.params;
      const tenantId = (req as any).tenantId;

      const opportunity = await manageOpportunityService.getOpportunity(tenantId, opportunityId);
      
      if (!opportunity) {
        res.status(404).json({ error: 'Opportunity not found' });
        return;
      }

      res.status(200).json({ data: opportunity });
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      res.status(500).json({ error: 'Failed to fetch opportunity' });
    }
  },

  async getOpportunities(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const { 
        pipelineId, 
        stageId, 
        source, 
        priority, 
        minValue, 
        maxValue, 
        tags, 
        search,
        limit = 50,
        offset = 0
      } = req.query;

      const filters: OpportunityFilters = {};
      
      if (pipelineId) filters.pipelineId = pipelineId as string;
      if (stageId) filters.stageId = stageId as string;
      if (source) filters.source = source as string;
      if (priority) filters.priority = priority as 'low' | 'medium' | 'high';
      if (minValue) filters.minValue = parseFloat(minValue as string);
      if (maxValue) filters.maxValue = parseFloat(maxValue as string);
      if (tags) filters.tags = Array.isArray(tags) ? tags as string[] : [tags as string];
      if (search) filters.search = search as string;

      const opportunities = await manageOpportunityService.getOpportunities(
        tenantId, 
        filters,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.status(200).json({ data: opportunities });
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
  },

  async updateOpportunity(req: Request, res: Response) {
    try {
      const updateData: UpdateOpportunityRequest = req.body;
      const tenantId = (req as any).tenantId;
      let opportunityId = (req as any).params.opportunityId || (updateData as any).opportunityId; // Get from params or body

      // If opportunityId not in params or body, try to resolve from contactId
      if (!opportunityId) {
        const { contactId } = updateData;

        if (!contactId) {
          res.status(400).json({
            error: 'Either opportunityId or contactId is required in request body'
          });
          return;
        }

        // Find the latest opportunity for this contact
        const resolvedOpportunityId = await manageContactOpportunityService.findLatestOpportunityId(
          tenantId,
          contactId
        );

        if (!resolvedOpportunityId) {
          res.status(404).json({
            error: 'No opportunities found for this contact',
            contactId
          });
          return;
        }

        opportunityId = resolvedOpportunityId;
        console.log(`📍 Auto-resolved opportunityId: ${opportunityId} for contactId: ${contactId}`);
      }

      // Remove opportunityId from updateData to avoid updating it
      const { opportunityId: _, ...cleanUpdateData } = updateData as any;

      const updatedOpportunity = await manageOpportunityService.updateOpportunity(
        tenantId,
        opportunityId,
        cleanUpdateData
      );

      res.status(200).json({
        message: 'Opportunity updated successfully',
        data: updatedOpportunity
      });
    } catch (error) {
      console.error('Error updating opportunity:', error);
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('not found')) {
        res.status(404).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: 'Failed to update opportunity' });
      }
    }
  },

  async deleteOpportunity(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const { opportunityId: bodyOpportunityId, contactId } = req.body;
      let opportunityId = bodyOpportunityId;

      // If opportunityId not provided, try to resolve from contactId
      if (!opportunityId) {
        if (!contactId) {
          res.status(400).json({
            error: 'Either opportunityId or contactId is required in request body'
          });
          return;
        }

        // Find the latest opportunity for this contact
        const resolvedOpportunityId = await manageContactOpportunityService.findLatestOpportunityId(
          tenantId,
          contactId
        );

        if (!resolvedOpportunityId) {
          res.status(404).json({
            error: 'No opportunities found for this contact',
            contactId
          });
          return;
        }

        opportunityId = resolvedOpportunityId;
        console.log(`📍 Auto-resolved opportunityId: ${opportunityId} for contactId: ${contactId}`);
      }

      await manageOpportunityService.deleteOpportunity(tenantId, opportunityId);
      res.status(200).json({
        message: 'Opportunity deleted successfully',
        opportunityId
      });
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('not found')) {
        res.status(404).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: 'Failed to delete opportunity' });
      }
    }
  },

  async moveOpportunity(req: Request, res: Response) {
    try {
      const { opportunityId } = req.params;
      const moveData: MoveOpportunityRequest = req.body;
      const tenantId = (req as any).tenantId;

      if (!moveData.pipelineId || !moveData.stageId) {
        res.status(400).json({ 
          error: 'pipelineId and stageId are required' 
        });
        return;
      }

      const updatedOpportunity = await manageOpportunityService.moveOpportunity(
        tenantId, 
        opportunityId, 
        moveData
      );
      
      res.status(200).json({ 
        message: 'Opportunity moved successfully', 
        data: updatedOpportunity 
      });
    } catch (error) {
      console.error('Error moving opportunity:', error);
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('not found')) {
        res.status(404).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: 'Failed to move opportunity' });
      }
    }
  },

  async getOpportunitiesByStage(req: Request, res: Response) {
    try {
      const { pipelineId, stageId } = req.params;
      const tenantId = (req as any).tenantId;

      const opportunities = await manageOpportunityService.getOpportunitiesByStage(
        tenantId, 
        pipelineId, 
        stageId
      );
      
      res.status(200).json({ data: opportunities });
    } catch (error) {
      console.error('Error fetching opportunities by stage:', error);
      res.status(500).json({ error: 'Failed to fetch opportunities by stage' });
    }
  },

  async bulkMoveOpportunities(req: Request, res: Response) {
    try {
      const { opportunityIds, pipelineId, stageId } = req.body;
      const tenantId = (req as any).tenantId;

      if (!opportunityIds || !Array.isArray(opportunityIds) || !pipelineId || !stageId) {
        res.status(400).json({ 
          error: 'opportunityIds (array), pipelineId, and stageId are required' 
        });
        return;
      }

      await manageOpportunityService.bulkMoveOpportunities(
        tenantId, 
        opportunityIds,
        { pipelineId, stageId }
      );
      
      res.status(200).json({ 
        message: `${opportunityIds.length} opportunities moved successfully`
      });
    } catch (error) {
      console.error('Error bulk moving opportunities:', error);
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('not found')) {
        res.status(404).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: 'Failed to bulk move opportunities' });
      }
    }
  },

  // Get opportunities for a specific contact
  async getContactOpportunities(req: Request, res: Response) {
    try {
      const { contactId } = req.params;
      const tenantId = (req as any).tenantId;

      if (!contactId) {
        res.status(400).json({ error: 'contactId is required' });
        return;
      }

      const contactOpportunities = await manageContactOpportunityService.getContactOpportunities(
        tenantId, 
        contactId
      );
      
      res.status(200).json({ data: contactOpportunities });
    } catch (error) {
      console.error('Error fetching contact opportunities:', error);
      res.status(500).json({ error: 'Failed to fetch contact opportunities' });
    }
  },

  // Get contact opportunity summary
  async getContactOpportunitySummary(req: Request, res: Response) {
    try {
      const { contactId } = req.params;
      const tenantId = (req as any).tenantId;

      if (!contactId) {
        res.status(400).json({ error: 'contactId is required' });
        return;
      }

      const summary = await manageContactOpportunityService.getContactOpportunitySummary(
        tenantId, 
        contactId
      );
      
      res.status(200).json({ data: summary });
    } catch (error) {
      console.error('Error fetching contact opportunity summary:', error);
      res.status(500).json({ error: 'Failed to fetch contact opportunity summary' });
    }
  },

  // Get latest opportunity ID for a contact
  async getLatestOpportunityId(req: Request, res: Response) {
    try {
      const { contactId } = req.params;
      const tenantId = (req as any).tenantId;

      if (!contactId) {
        res.status(400).json({ error: 'contactId is required' });
        return;
      }

      const opportunityId = await manageContactOpportunityService.findLatestOpportunityId(
        tenantId,
        contactId
      );

      if (!opportunityId) {
        res.status(404).json({
          error: 'No opportunities found for this contact',
          contactId
        });
        return;
      }

      res.status(200).json({
        data: {
          opportunityId,
          contactId
        }
      });
    } catch (error) {
      console.error('Error fetching latest opportunity ID:', error);
      res.status(500).json({ error: 'Failed to fetch latest opportunity ID' });
    }
  }
};