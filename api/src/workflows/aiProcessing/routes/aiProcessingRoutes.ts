import { Router } from 'express';
import {
  processRequestController,
  getCasesController,
  getSingleCaseController,
  updateCaseController,
  deleteCaseController,
} from '../controllers/aiProcessingController';

const router = Router();

// NOTE: All routes here inherit authenticateEither from routes/index.ts
// This means they accept EITHER Firebase JWT OR API Key
// tenantId is automatically available as req.tenantId

// ==================== AI Processing Routes ====================

// POST /api/workflows/ai-processing/process - Main AI processing endpoint
// Body: { workflowId, nodeId, nodeName?, prompt, systemPrompt? }
// Returns: { success, data: { caseId, response } }
router.post('/process', processRequestController);

// ==================== Case Management Routes ====================

// GET /api/workflows/ai-processing/cases - Get all cases for a workflow/node
// Query: ?workflowId=xxx&nodeId=xxx&nodeName=xxx (nodeName optional)
// Returns: { success, data: AIProcessingCase[] }
router.get('/cases', getCasesController);

// GET /api/workflows/ai-processing/cases/:caseId - Get single case
// Params: caseId
// Query: ?workflowId=xxx&nodeId=xxx (required for firestore path)
// Returns: { success, data: AIProcessingCase }
router.get('/cases/:caseId', getSingleCaseController);

// PUT /api/workflows/ai-processing/cases/:caseId - Update case
// Params: caseId
// Query: ?workflowId=xxx&nodeId=xxx (required for firestore path)
// Body: { status?, response?, error? }
// Returns: { success, data: AIProcessingCase }
router.put('/cases/:caseId', updateCaseController);

// DELETE /api/workflows/ai-processing/cases/:caseId - Delete case
// Params: caseId
// Query: ?workflowId=xxx&nodeId=xxx (required for firestore path)
// Returns: { success, message }
router.delete('/cases/:caseId', deleteCaseController);

export default router;
