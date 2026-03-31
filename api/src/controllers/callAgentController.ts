import { Request, Response } from 'express';
import { 
  CallAgent,
  CallAgentRequest,
  ApiResponse
} from '@/types';
import { AgentService } from '../services/agentService';

export class CallAgentController {

  // Get all call agents for tenant
  static async getCallAgents(req: Request, res: Response): Promise<void> {
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

      const agents = await AgentService.getCallAgents(tenantId);

      res.status(200).json({
        success: true,
        data: agents,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get call agents error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get call agents',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Create a new call agent
  static async createCallAgent(req: Request<{}, ApiResponse<CallAgent>, CallAgentRequest>, res: Response): Promise<void> {
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

      const agentData = await AgentService.createCallAgent(tenantId, userId, req.body);

      res.status(201).json({
        success: true,
        data: agentData,
        message: 'Call agent created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Create call agent error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create call agent',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get specific call agent
  static async getCallAgent(req: Request, res: Response): Promise<void> {
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

      const agent = await AgentService.getCallAgent(tenantId, id);

      if (!agent) {
        res.status(404).json({
          success: false,
          error: 'Call agent not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: agent,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get call agent error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get call agent',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Update call agent
  static async updateCallAgent(req: Request<{id: string}, ApiResponse<CallAgent>, Partial<CallAgentRequest>>, res: Response): Promise<void> {
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

      const updatedAgent = await AgentService.updateCallAgent(tenantId, id, userId, req.body);

      if (!updatedAgent) {
        res.status(404).json({
          success: false,
          error: 'Call agent not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedAgent,
        message: 'Call agent updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Update call agent error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update call agent',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Delete call agent
  static async deleteCallAgent(req: Request, res: Response): Promise<void> {
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

      const deleted = await AgentService.deleteCallAgent(tenantId, id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Call agent not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Call agent deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Delete call agent error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete call agent',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Toggle agent status (active/paused)
  static async toggleAgentStatus(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      const { status } = req.body;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!['active', 'paused'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status. Must be "active" or "paused"',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updated = await AgentService.toggleAgentStatus(tenantId, id, status);

      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Call agent not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Agent ${status === 'active' ? 'activated' : 'paused'} successfully`,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Toggle agent status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update agent status',
        timestamp: new Date().toISOString()
      });
    }
  }

}