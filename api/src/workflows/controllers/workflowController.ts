import { Request, Response } from 'express';
import {
  createWorkflow,
  getWorkflow,
  getWorkflows,
  updateWorkflow,
  deleteWorkflow
} from '../services/workflowCrudManager';
import {
  createFolder,
  getFolder,
  getFolders,
  updateFolder,
  deleteFolder,
  getFolderContents,
  addWorkflowToFolder
} from '../services/workflowFolderManager';
import { setFieldMappingReference } from '../services/setFieldMappingReference/index';
import { runWorkflow } from '../services/runWorkflow';

// ==================== Workflow Controllers ====================

export const createWorkflowController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!tenantId || !userId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const workflow = await createWorkflow(tenantId, userId, req.body);

    res.status(201).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow'
    });
  }
};

export const getWorkflowController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const workflow = await getWorkflow(tenantId, id);

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Error getting workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow'
    });
  }
};

export const getWorkflowsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const workflows = await getWorkflows(tenantId);

    res.status(200).json({
      success: true,
      data: workflows
    });
  } catch (error) {
    console.error('Error getting workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflows'
    });
  }
};

export const updateWorkflowController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.uid;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    // Debug: Log incoming update request
    console.log('📝 Update workflow request:', {
      workflowId: id,
      hasNodes: !!req.body.nodes,
      nodesCount: req.body.nodes?.length,
      hasEdges: !!req.body.edges,
      edgesCount: req.body.edges?.length,
      isPublic: req.body.isPublic,
      status: req.body.status,
    });

    const workflow = await updateWorkflow(tenantId, id, req.body, userId);

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workflow'
    });
  }
};

export const deleteWorkflowController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const deleted = await deleteWorkflow(tenantId, id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete workflow'
    });
  }
};

export const batchDeleteWorkflowsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { workflowIds } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    if (!Array.isArray(workflowIds) || workflowIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'workflowIds must be a non-empty array'
      });
      return;
    }

    console.log(`🗑️  Starting batch deletion of ${workflowIds.length} workflows`);

    // Store results in memory
    const results: Array<{
      workflowId: string;
      success: boolean;
      error?: string;
    }> = [];

    // Delete workflows one by one to avoid overwhelming n8n
    for (const workflowId of workflowIds) {
      try {
        console.log(`🗑️  [${results.length + 1}/${workflowIds.length}] Deleting workflow: ${workflowId}`);
        const deleted = await deleteWorkflow(tenantId, workflowId);

        results.push({
          workflowId,
          success: deleted,
          error: deleted ? undefined : 'Workflow not found'
        });

        console.log(`  ${deleted ? '✅' : '⚠️'} ${deleted ? 'Deleted' : 'Not found'}: ${workflowId}`);
      } catch (error: any) {
        console.error(`  ❌ Error deleting workflow ${workflowId}:`, error.message);
        results.push({
          workflowId,
          success: false,
          error: error.message || 'Unknown error'
        });
      }
    }

    // Calculate summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`✅ Batch deletion complete: ${successCount} succeeded, ${failureCount} failed`);

    res.status(200).json({
      success: true,
      message: `Batch deletion complete: ${successCount} succeeded, ${failureCount} failed`,
      data: {
        total: workflowIds.length,
        succeeded: successCount,
        failed: failureCount,
        results
      }
    });
  } catch (error) {
    console.error('Error in batch delete workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch delete workflows'
    });
  }
};

// ==================== Folder Controllers ====================

export const createFolderController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!tenantId || !userId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const folder = await createFolder(tenantId, userId, req.body);

    res.status(201).json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create folder'
    });
  }
};

export const getFolderController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const folder = await getFolder(tenantId, id);

    if (!folder) {
      res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Error getting folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get folder'
    });
  }
};

export const getFoldersController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const folders = await getFolders(tenantId);

    res.status(200).json({
      success: true,
      data: folders
    });
  } catch (error) {
    console.error('Error getting folders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get folders'
    });
  }
};

export const updateFolderController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const folder = await updateFolder(tenantId, id, req.body);

    if (!folder) {
      res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update folder'
    });
  }
};

export const deleteFolderController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const deleted = await deleteFolder(tenantId, id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete folder'
    });
  }
};

export const getFolderContentsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const workflows = await getFolderContents(tenantId, id);

    res.status(200).json({
      success: true,
      data: workflows
    });
  } catch (error) {
    console.error('Error getting folder contents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get folder contents'
    });
  }
};

export const addWorkflowToFolderController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { id: folderId } = req.params;
    const { workflowId } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    if (!workflowId) {
      res.status(400).json({
        success: false,
        error: 'workflowId is required'
      });
      return;
    }

    const workflow = await addWorkflowToFolder(tenantId, folderId, workflowId);

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Error adding workflow to folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add workflow to folder'
    });
  }
};

// ==================== Trigger Workflow Controller ====================

export const triggerWorkflowController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get tenantId from auth middleware (supports both JWT and API key)
    const tenantId = req.tenantId;
    const { workflowId, payload } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Authentication required - tenantId not found'
      });
      return;
    }

    if (!workflowId) {
      res.status(400).json({
        success: false,
        error: 'workflowId is required'
      });
      return;
    }

    console.log(`🚀 Trigger workflow request: ${workflowId}`);

    const result = await runWorkflow(tenantId, workflowId, payload);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error triggering workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger workflow',
      message: error.message
    });
  }
};

// ==================== Batch Trigger Workflow Controller ====================

export const batchTriggerWorkflowController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { workflowId, contactIds } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Authentication required - tenantId not found'
      });
      return;
    }

    if (!workflowId) {
      res.status(400).json({
        success: false,
        error: 'workflowId is required'
      });
      return;
    }

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'contactIds must be a non-empty array'
      });
      return;
    }

    if (contactIds.length > 50) {
      res.status(400).json({
        success: false,
        error: 'Cannot enroll more than 50 contacts at once. Please split into smaller batches.'
      });
      return;
    }

    console.log(`🚀 Batch triggering workflow ${workflowId} for ${contactIds.length} contacts`);

    // Store results in memory
    const results: Array<{
      contactId: string;
      success: boolean;
      executionId?: string;
      error?: string;
    }> = [];

    // Helper function to wait for specified milliseconds
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Trigger workflows one by one with 1 second delay between each
    for (let i = 0; i < contactIds.length; i++) {
      const contactId = contactIds[i];

      try {
        console.log(`🚀 [${i + 1}/${contactIds.length}] Triggering workflow for contact: ${contactId}`);

        const result = await runWorkflow(tenantId, workflowId, { contactId });

        results.push({
          contactId,
          success: true,
          executionId: result.executionId
        });

        console.log(`  ✅ Triggered: ${contactId} (execution: ${result.executionId})`);
      } catch (error: any) {
        console.error(`  ❌ Error triggering for contact ${contactId}:`, error.message);
        results.push({
          contactId,
          success: false,
          error: error.message || 'Unknown error'
        });
      }

      // Wait 1 second before next request (except for the last one)
      if (i < contactIds.length - 1) {
        await wait(1000);
      }
    }

    // Calculate summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`✅ Batch trigger complete: ${successCount} succeeded, ${failureCount} failed`);

    res.status(200).json({
      success: true,
      message: `Batch enrollment complete: ${successCount} succeeded, ${failureCount} failed`,
      data: {
        total: contactIds.length,
        succeeded: successCount,
        failed: failureCount,
        results
      }
    });
  } catch (error: any) {
    console.error('Error in batch trigger:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch trigger workflow',
      message: error.message
    });
  }
};

// ==================== Field Mapping Controller ====================

export const setFieldMappingController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { workflowId } = req.params;
    const { testId } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    if (!workflowId) {
      res.status(400).json({
        success: false,
        error: 'workflowId is required'
      });
      return;
    }

    if (!testId) {
      res.status(400).json({
        success: false,
        error: 'testId is required in request body'
      });
      return;
    }

    const result = await setFieldMappingReference(tenantId, workflowId, testId);

    res.status(200).json({
      success: true,
      message: 'Field mapping reference set successfully',
      data: {
        testId: result.testId,
        fieldsCount: result.fieldsCount,
        availableFields: result.availableFields
      }
    });
  } catch (error: any) {
    console.error('Error setting field mapping reference:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set field mapping reference',
      message: error.message
    });
  }
};
