import { Request, Response } from 'express';
import { CustomToolService, CustomToolRequest } from '../services/customToolService';
import { elevenlabsAgentService } from '../services/elevenlabsAgentService';
import { ApiResponse } from '@/types';

export class CustomToolController {
  // Get all custom tools for tenant
  static async getCustomTools(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const tools = await CustomToolService.getCustomTools(tenantId);

      res.status(200).json({
        success: true,
        data: tools,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get custom tools error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get custom tools',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get specific custom tool
  static async getCustomTool(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const tool = await CustomToolService.getCustomTool(tenantId, id);

      if (!tool) {
        res.status(404).json({
          success: false,
          error: 'Custom tool not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: tool,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get custom tool error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get custom tool',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Create new custom tool
  static async createCustomTool(req: Request<{}, ApiResponse<any>, CustomToolRequest>, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.uid;
      
      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const toolData = await CustomToolService.createCustomTool(
        tenantId,
        userId,
        req.body,
        elevenlabsAgentService
      );

      res.status(201).json({
        success: true,
        data: toolData,
        message: 'Custom tool created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Create custom tool error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create custom tool',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Update custom tool
  static async updateCustomTool(req: Request<{id: string}, ApiResponse<any>, Partial<CustomToolRequest>>, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.uid;
      const { id } = req.params;
      
      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatedTool = await CustomToolService.updateCustomTool(
        tenantId,
        id,
        userId,
        req.body,
        elevenlabsAgentService
      );

      if (!updatedTool) {
        res.status(404).json({
          success: false,
          error: 'Custom tool not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedTool,
        message: 'Custom tool updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Update custom tool error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update custom tool',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Delete custom tool
  static async deleteCustomTool(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const deleted = await CustomToolService.deleteCustomTool(
        tenantId,
        id,
        elevenlabsAgentService
      );

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Custom tool not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Custom tool deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Delete custom tool error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete custom tool',
        timestamp: new Date().toISOString()
      });
    }
  }
}