import { Request, Response } from 'express';
import {
  createWorkspace,
  readWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceNames,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from '../services/workspaceManager';

/**
 * Create a new workspace
 * POST /api/workspaces
 */
export async function handleCreateWorkspace(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    const uid = req.userId;

    if (!tenantId || !uid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Tenant ID and User ID are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const input: CreateWorkspaceInput = req.body;

    if (!input.name || input.name.trim() === '') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Workspace name is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const workspace = await createWorkspace(tenantId, uid, input);

    res.status(201).json({
      success: true,
      workspace,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create workspace',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get a workspace by ID
 * GET /api/workspaces/:id
 */
export async function handleGetWorkspace(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Tenant ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const workspace = await readWorkspace(tenantId, id);

    if (!workspace) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Workspace not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      workspace,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch workspace',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get all workspace names for a tenant
 * GET /api/workspaces
 */
export async function handleGetWorkspaceNames(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Tenant ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const workspaces = await getWorkspaceNames(tenantId);

    res.status(200).json({
      success: true,
      workspaces,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching workspace names:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch workspace names',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Update a workspace
 * PUT /api/workspaces/:id
 */
export async function handleUpdateWorkspace(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Tenant ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const input: UpdateWorkspaceInput = req.body;

    const workspace = await updateWorkspace(tenantId, id, input);

    if (!workspace) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Workspace not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      workspace,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating workspace:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update workspace',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Delete a workspace
 * DELETE /api/workspaces/:id
 */
export async function handleDeleteWorkspace(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Tenant ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const deleted = await deleteWorkspace(tenantId, id);

    if (!deleted) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Workspace not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Workspace deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete workspace',
      timestamp: new Date().toISOString(),
    });
  }
}
