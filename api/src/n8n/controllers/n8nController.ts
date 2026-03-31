import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { workflowManager } from '../services/workflowManager';
import { workflowExecutions } from '../services/workflowExecutions';
import { createWorkflowInFirestore, updateWorkflowInFirestore, deleteWorkflowFromFirestore } from '../utils/syncN8nWorkflowFirestore';
import { resolveN8nWorkflowId } from '../utils/resolveN8nWorkflowId';
import { convertReactFlowToN8n, validateReactFlowWorkflow } from '../utils/convertReactFlow2N8n';
import { WorkflowData } from '../services/types';

export const createWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    // Check if incoming data is ReactFlow format (has 'edges') or n8n format (has 'connections')
    const isReactFlowFormat = 'edges' in req.body && !('connections' in req.body);

    let workflowData: WorkflowData;

    if (isReactFlowFormat) {
      console.log(`Converting ReactFlow workflow "${req.body.name}" to n8n format`);

      // Validate ReactFlow format
      try {
        validateReactFlowWorkflow(req.body);
      } catch (validationError) {
        res.status(400).json({
          error: 'Invalid ReactFlow workflow format',
          message: validationError instanceof Error ? validationError.message : 'Unknown error'
        });
        return;
      }

      // Convert ReactFlow to n8n format
      workflowData = await convertReactFlowToN8n(req.body);
    } else {
      // Already in n8n format
      const { name, nodes, connections, settings } = req.body;

      if (!name) {
        res.status(400).json({
          error: 'Workflow name is required'
        });
        return;
      }

      workflowData = {
        name,
        nodes: nodes || [],
        connections: connections || {},
        settings: settings || {}
      };
    }

    console.log(`Creating workflow "${workflowData.name}" for tenant ${tenantId}`);

    // Generate a workflow ID
    const workflowId = uuidv4();

    // Call service to create workflow in n8n
    // Note: n8n API has read-only fields during creation: active, tags
    // settings is required but must be empty object
    const n8nWorkflow = await workflowManager.createWorkflow(workflowData, tenantId, workflowId);

    // Sync workflow to Firestore subcollection
    await createWorkflowInFirestore(tenantId, workflowId, n8nWorkflow);

    res.json({
      success: true,
      data: {
        workflowId: workflowId, // Our internal ID
        n8nWorkflowId: n8nWorkflow.id, // n8n's ID
        name: n8nWorkflow.name,
        active: n8nWorkflow.active,
        nodes: n8nWorkflow.nodes,
        connections: n8nWorkflow.connections,
        settings: n8nWorkflow.settings,
        tags: n8nWorkflow.tags
      }
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

    // Optional query params for filtering
    const { active, limit } = req.query;

    console.log(`Fetching workflows for tenant ${tenantId}`);

    // Call service to get workflows from n8n
    const workflows = await workflowManager.getWorkflows({
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });

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

    // Resolve local workflow ID to n8n workflow ID
    const n8nWorkflowId = await resolveN8nWorkflowId(tenantId, id);

    // Call service to get single workflow from n8n
    const workflow = await workflowManager.readWorkflow(n8nWorkflowId);

    res.json({
      success: true,
      data: {
        workflowId: id, // Our local ID
        n8nWorkflowId: workflow.id, // n8n's ID
        ...workflow
      }
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

    // Check if incoming data is ReactFlow format (has 'edges') or n8n format (has 'connections')
    const isReactFlowFormat = 'edges' in req.body && !('connections' in req.body);

    let updateData: any;

    if (isReactFlowFormat) {
      console.log(`Converting ReactFlow workflow update to n8n format`);

      // Validate ReactFlow format
      try {
        validateReactFlowWorkflow(req.body);
      } catch (validationError) {
        res.status(400).json({
          error: 'Invalid ReactFlow workflow format',
          message: validationError instanceof Error ? validationError.message : 'Unknown error'
        });
        return;
      }

      // Convert ReactFlow to n8n format
      const converted = await convertReactFlowToN8n(req.body);
      updateData = {
        name: converted.name,
        nodes: converted.nodes,
        connections: converted.connections,
        settings: converted.settings,
        // Note: 'active' field is read-only in n8n API updates
      };
    } else {
      // Already in n8n format
      const { name, nodes, connections, settings, tags } = req.body;
      updateData = {
        name,
        nodes,
        connections,
        settings,
        tags,
        // Note: 'active' field is read-only in n8n API updates
      };
    }

    // Resolve local workflow ID to n8n workflow ID
    const n8nWorkflowId = await resolveN8nWorkflowId(tenantId, id);

    // Call service to update workflow in n8n (with legacy support for mapping creation)
    const n8nWorkflow = await workflowManager.updateWorkflow(n8nWorkflowId, updateData, tenantId, id);

    // Sync updated workflow back to Firestore
    await updateWorkflowInFirestore(tenantId, id, n8nWorkflow);

    res.json({
      success: true,
      data: {
        workflowId: id, // Our local ID
        n8nWorkflowId: n8nWorkflow.id, // n8n's ID
        ...n8nWorkflow
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

    // Resolve local workflow ID to n8n workflow ID
    const n8nWorkflowId = await resolveN8nWorkflowId(tenantId, id);

    // Call service to delete workflow from n8n
    await workflowManager.deleteWorkflow(n8nWorkflowId);

    // Delete workflow from Firestore
    await deleteWorkflowFromFirestore(tenantId, id);

    res.json({
      success: true,
      data: {
        message: 'Workflow deleted successfully',
        workflowId: id,
        n8nWorkflowId
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

/**
 * Get list of executions for a workflow
 * Accepts either localWorkflowId or n8nWorkflowId
 */
export const getExecutionsList = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    const { localWorkflowId, n8nWorkflowId, status, limit, cursor } = req.query;

    // Must provide either localWorkflowId or n8nWorkflowId
    if (!localWorkflowId && !n8nWorkflowId) {
      res.status(400).json({
        error: 'Either localWorkflowId or n8nWorkflowId is required'
      });
      return;
    }

    // Resolve n8n workflow ID
    let resolvedN8nWorkflowId: string;

    if (n8nWorkflowId) {
      // Use provided n8n workflow ID directly
      resolvedN8nWorkflowId = n8nWorkflowId as string;
      console.log(`Using provided n8n workflow ID: ${resolvedN8nWorkflowId}`);
    } else {
      // Resolve from local workflow ID
      resolvedN8nWorkflowId = await resolveN8nWorkflowId(tenantId, localWorkflowId as string);
    }

    console.log(`Fetching executions for workflow ${resolvedN8nWorkflowId}`);

    // Call service to get executions list
    const result = await workflowExecutions.getExecutionsList({
      workflowId: resolvedN8nWorkflowId,
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined,
      cursor: cursor as string
    });

    res.json({
      success: true,
      data: result.data,
      nextCursor: result.nextCursor
    });

  } catch (error) {
    console.error('Error fetching executions list:', error);
    res.status(500).json({
      error: 'Failed to fetch executions list',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get single execution with full data
 */
export const getExecutionDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { executionId } = req.params;
    const tenantId = req.tenantId;
    const userId = req.user?.uid;

    if (!executionId) {
      res.status(400).json({
        error: 'Execution ID is required'
      });
      return;
    }

    if (!tenantId || !userId) {
      res.status(400).json({
        error: 'User authentication required'
      });
      return;
    }

    const { includeData } = req.query;

    console.log(`Fetching execution ${executionId}`);

    // Call service to get execution details
    const execution = await workflowExecutions.getExecution(
      executionId,
      includeData === 'false' ? false : true // Default to true
    );

    res.json({
      success: true,
      data: execution
    });

  } catch (error) {
    console.error('Error fetching execution details:', error);
    res.status(500).json({
      error: 'Failed to fetch execution details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
