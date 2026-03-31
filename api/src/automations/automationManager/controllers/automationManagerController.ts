import { Request, Response } from 'express';
import { createAutomationService } from '../services/createAutomation';
import { getAutomationsService } from '../services/getAutomations';
import { manageFoldersService } from '../services/manageFolders';
import { getFoldersService } from '../services/getFolders';
import { getFolderContentsService } from '../services/getFolderContents';

export const getAutomationsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    
    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No tenant ID found'
      });
      return;
    }

    const automations = await getAutomationsService(tenantId);

    res.status(200).json({
      success: true,
      data: automations
    });
  } catch (error) {
    console.error('Error fetching automations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch automations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createAutomationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    
    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No tenant ID found'
      });
      return;
    }

    // Extract name from request body if provided, otherwise use default
    const { name } = req.body;

    const automation = await createAutomationService(tenantId, name);

    res.status(201).json({
      success: true,
      data: automation
    });
  } catch (error) {
    console.error('Error creating automation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create automation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getFoldersController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    
    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No tenant ID found'
      });
      return;
    }

    const folders = await getFoldersService(tenantId);

    res.status(200).json({
      success: true,
      data: folders
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch folders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createFolderController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No tenant ID found'
      });
      return;
    }

    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({
        success: false,
        error: 'name is required and must be a string'
      });
      return;
    }

    const folder = await manageFoldersService.createFolder(tenantId, name);

    res.status(201).json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create folder',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const addAutomationToFolderController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { folderId } = req.params;
    const { automationIds } = req.body;
    
    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No tenant ID found'
      });
      return;
    }

    if (!folderId) {
      res.status(400).json({
        success: false,
        error: 'folderId is required'
      });
      return;
    }

    if (!automationIds || !Array.isArray(automationIds) || automationIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'automationIds must be a non-empty array'
      });
      return;
    }

    // Add each automation to the folder
    const results = [];
    for (const automationId of automationIds) {
      await manageFoldersService.editFolder.addAutomationToFolder(tenantId, folderId, automationId);
      results.push({ automationId, success: true });
    }

    res.status(200).json({
      success: true,
      data: { results, message: `Added ${automationIds.length} automation(s) to folder` }
    });
  } catch (error) {
    console.error('Error adding automation to folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add automation to folder',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getFolderContentsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { folderId } = req.params;
    
    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No tenant ID found'
      });
      return;
    }

    if (!folderId) {
      res.status(400).json({
        success: false,
        error: 'folderId is required'
      });
      return;
    }

    const automations = await getFolderContentsService(tenantId, folderId);

    res.status(200).json({
      success: true,
      data: automations
    });
  } catch (error) {
    console.error('Error fetching folder contents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch folder contents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};