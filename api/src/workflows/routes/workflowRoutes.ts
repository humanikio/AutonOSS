import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import {
  createWorkflowController,
  getWorkflowController,
  getWorkflowsController,
  updateWorkflowController,
  deleteWorkflowController,
  batchDeleteWorkflowsController,
  createFolderController,
  getFolderController,
  getFoldersController,
  updateFolderController,
  deleteFolderController,
  getFolderContentsController,
  addWorkflowToFolderController,
  setFieldMappingController,
  triggerWorkflowController,
  batchTriggerWorkflowController
} from '../controllers/workflowController';
import nodeRegistryRoutes from './nodeRegistryRoutes';

const router = Router();

// NOTE: All routes here inherit authenticateEither from routes/index.ts
// This means they accept EITHER Firebase JWT OR API Key

// ==================== Node Registry Routes ====================
// Mount node registry routes (handles /nodes, /nodes/stats, etc.)
router.use('/', nodeRegistryRoutes);

// ==================== Workflow Routes ====================

// POST /api/workflows - Create new workflow
router.post('/workflows', createWorkflowController);

// POST /api/workflows/batch-delete - Batch delete workflows
router.post('/workflows/batch-delete', batchDeleteWorkflowsController);

// GET /api/workflows - Get all workflows
router.get('/workflows', getWorkflowsController);

// GET /api/workflows/:id - Get single workflow
router.get('/workflows/:id', getWorkflowController);

// PUT /api/workflows/:id - Update workflow
router.put('/workflows/:id', updateWorkflowController);

// DELETE /api/workflows/:id - Delete workflow
router.delete('/workflows/:id', deleteWorkflowController);

// POST /api/workflows/trigger - Trigger a workflow (accepts API key or JWT)
router.post('/workflows/trigger', triggerWorkflowController);

// POST /api/workflows/batch-trigger - Batch trigger workflow for multiple contacts
router.post('/workflows/batch-trigger', batchTriggerWorkflowController);

// ==================== Folder Routes ====================

// POST /api/workflows/folders - Create new folder
router.post('/folders', createFolderController);

// GET /api/workflows/folders - Get all folders
router.get('/folders', getFoldersController);

// GET /api/workflows/folders/:id - Get single folder
router.get('/folders/:id', getFolderController);

// PUT /api/workflows/folders/:id - Update folder
router.put('/folders/:id', updateFolderController);

// DELETE /api/workflows/folders/:id - Delete folder
router.delete('/folders/:id', deleteFolderController);

// GET /api/workflows/folders/:id/contents - Get folder contents
router.get('/folders/:id/contents', getFolderContentsController);

// POST /api/workflows/folders/:id/add-workflow - Add workflow to folder
router.post('/folders/:id/add-workflow', addWorkflowToFolderController);

// ==================== Field Mapping Routes ====================

// POST /api/workflows/:workflowId/set-field-mapping - Set field mapping reference from test event
router.post('/:workflowId/set-field-mapping', setFieldMappingController);

export default router;
