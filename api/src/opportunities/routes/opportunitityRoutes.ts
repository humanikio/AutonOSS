import { Router } from 'express';
import { opportunityController } from '../controllers/opportunitityController';

const router = Router();

// Pipeline management routes
router.post('/pipelines', opportunityController.createPipeline);
router.delete('/pipelines/:pipelineId', opportunityController.deletePipeline);
router.get('/pipelines', opportunityController.getPipelines);
router.put('/pipelines/:pipelineId', opportunityController.updatePipeline);

// Stage management routes (within pipelines)
router.get('/pipelines/:pipelineId/stages', opportunityController.getStages);
router.post('/pipelines/:pipelineId/stages', opportunityController.createStage);
router.delete('/pipelines/:pipelineId/stages/:stageId', opportunityController.deleteStage);
router.put('/pipelines/:pipelineId/stages/:stageId', opportunityController.updateStage);

// Opportunity management routes
router.post('/opportunities', opportunityController.createOpportunity);
router.get('/opportunities', opportunityController.getOpportunities);
router.get('/opportunities/:opportunityId', opportunityController.getOpportunity);
router.put('/opportunities/:opportunityId', opportunityController.updateOpportunity); // Accept opportunityId in params
router.put('/opportunities', opportunityController.updateOpportunity); // Accept opportunityId or contactId in body
router.delete('/opportunities', opportunityController.deleteOpportunity); // Accept opportunityId or contactId in body

// Opportunity movement
router.put('/opportunities/:opportunityId/move', opportunityController.moveOpportunity);
router.post('/opportunities/bulk-move', opportunityController.bulkMoveOpportunities);

// Get opportunities by stage (for kanban view)
router.get('/pipelines/:pipelineId/stages/:stageId/opportunities', opportunityController.getOpportunitiesByStage);

// Contact-specific opportunity routes
router.get('/contacts/:contactId/opportunities', opportunityController.getContactOpportunities);
router.get('/contacts/:contactId/opportunities/summary', opportunityController.getContactOpportunitySummary);
router.get('/contacts/:contactId/opportunities/latest-id', opportunityController.getLatestOpportunityId);

export default router;