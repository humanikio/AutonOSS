import { Request, Response } from 'express';
import { automationManager } from '../services/automationManager';

// ===== WORKFLOW CONTROLLERS =====

export const createWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, status } = req.body;
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    console.log(`Creating automation workflow for tenant ${tenantId}`);

    // Call service to create workflow
    const workflow = await automationManager.createWorkflow(tenantId, {
      name,
      status
    });

    res.status(201).json({
      success: true,
      data: workflow
    });

  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({
      error: 'Failed to create workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAllWorkflows = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    console.log(`Fetching workflows for tenant ${tenantId}`);

    // Call service to get workflows
    const workflows = await automationManager.getWorkflows(tenantId);

    res.json({
      success: true,
      data: workflows
    });

  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({
      error: 'Failed to fetch workflows',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!id) {
      res.status(400).json({
        error: 'Workflow ID is required'
      });
      return;
    }

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    console.log(`Fetching workflow ${id} for tenant ${tenantId}`);

    // Call service to get single workflow
    const workflow = await automationManager.getWorkflow(tenantId, id);

    res.json({
      success: true,
      data: workflow
    });

  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({
      error: 'Failed to fetch workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, status, n8nWorkflowId, totalEnrolled, activeEnrolled } = req.body;
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!id) {
      res.status(400).json({
        error: 'Workflow ID is required'
      });
      return;
    }

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    console.log(`Updating workflow ${id} for tenant ${tenantId}`);

    // Call service to update workflow
    await automationManager.updateWorkflow(tenantId, id, {
      name,
      status,
      n8nWorkflowId,
      totalEnrolled,
      activeEnrolled
    });

    res.json({
      success: true,
      data: {
        message: 'Workflow updated successfully',
        workflowId: id
      }
    });

  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({
      error: 'Failed to update workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!id) {
      res.status(400).json({
        error: 'Workflow ID is required'
      });
      return;
    }

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    console.log(`Deleting workflow ${id} for tenant ${tenantId}`);

    // Call service to delete workflow
    await automationManager.deleteWorkflow(tenantId, id);

    res.json({
      success: true,
      data: {
        message: 'Workflow deleted successfully',
        workflowId: id
      }
    });

  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({
      error: 'Failed to delete workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ===== FOLDER CONTROLLERS =====

export const getAllFolders = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    console.log(`Fetching folders for tenant ${tenantId}`);

    // Call service to get folders
    const folders = await automationManager.getFolders(tenantId);

    res.json({
      success: true,
      data: folders
    });

  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({
      error: 'Failed to fetch folders',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!name) {
      res.status(400).json({
        error: 'Folder name is required'
      });
      return;
    }

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    console.log(`Creating folder for tenant ${tenantId}`);

    // Call service to create folder
    const folder = await automationManager.createFolder(tenantId, { name });

    res.status(201).json({
      success: true,
      data: folder
    });

  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      error: 'Failed to create folder',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, workflowIds } = req.body;
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!id) {
      res.status(400).json({
        error: 'Folder ID is required'
      });
      return;
    }

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    console.log(`Updating folder ${id} for tenant ${tenantId}`);

    // Call service to update folder
    await automationManager.updateFolder(tenantId, id, {
      name,
      workflowIds
    });

    res.json({
      success: true,
      data: {
        message: 'Folder updated successfully',
        folderId: id
      }
    });

  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({
      error: 'Failed to update folder',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!id) {
      res.status(400).json({
        error: 'Folder ID is required'
      });
      return;
    }

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    console.log(`Deleting folder ${id} for tenant ${tenantId}`);

    // Call service to delete folder
    await automationManager.deleteFolder(tenantId, id);

    res.json({
      success: true,
      data: {
        message: 'Folder deleted successfully',
        folderId: id
      }
    });

  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({
      error: 'Failed to delete folder',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
