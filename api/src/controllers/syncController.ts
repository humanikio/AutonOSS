import { Request, Response } from 'express';
import { knowledgeSyncService } from '../services/knowledgeSyncService';
import { ApiResponse } from '@/types';

export class SyncController {
  // Get knowledge changes (what needs syncing)
  static async getKnowledgeChanges(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const changes = await knowledgeSyncService.detectKnowledgeChanges(tenantId);

      res.status(200).json({
        success: true,
        data: changes,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get knowledge changes error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect knowledge changes',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get sync status for all agents
  static async getSyncStatus(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const syncStatus = await knowledgeSyncService.getSyncStatus(tenantId);

      res.status(200).json({
        success: true,
        data: syncStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get sync status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sync status',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Sync knowledge for all or specific agents
  static async syncKnowledge(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { agentIds } = req.body as { agentIds?: string[] };
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          timestamp: new Date().toISOString()
        });
        return;
      }

      let targetAgentIds: string[] = [];

      if (agentIds && agentIds.length > 0) {
        // Sync specific agents
        targetAgentIds = agentIds;
      } else {
        // Sync all agents with changes
        const changes = await knowledgeSyncService.detectKnowledgeChanges(tenantId);
        targetAgentIds = changes.affectedAgents;
      }

      if (targetAgentIds.length === 0) {
        res.status(200).json({
          success: true,
          message: 'No agents need syncing',
          data: [],
          timestamp: new Date().toISOString()
        });
        return;
      }

      const results = await knowledgeSyncService.syncAgentsKnowledge(tenantId, targetAgentIds);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      res.status(200).json({
        success: true,
        message: `Sync completed: ${successCount} successful, ${failureCount} failed`,
        data: results,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Sync knowledge error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync knowledge',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Sync knowledge for a single agent
  static async syncSingleAgentKnowledge(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id: agentId } = req.params;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'Agent ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const results = await knowledgeSyncService.syncAgentsKnowledge(tenantId, [agentId]);
      const result = results[0];

      if (result.success) {
        res.status(200).json({
          success: true,
          message: `Agent knowledge synced successfully`,
          data: result,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to sync agent knowledge',
          data: result,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error: any) {
      console.error('Sync single agent knowledge error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync agent knowledge',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get affected agents by knowledge type
  static async getAffectedAgents(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { knowledgeType, itemIds } = req.query;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!knowledgeType || !['businessInfo', 'products', 'faqs', 'brandGuidelines'].includes(knowledgeType as string)) {
        res.status(400).json({
          success: false,
          error: 'Valid knowledge type is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const parsedItemIds = itemIds ? (itemIds as string).split(',') : undefined;
      
      const affectedAgents = await knowledgeSyncService.getAffectedAgentsByKnowledgeType(
        tenantId,
        knowledgeType as any,
        parsedItemIds
      );

      res.status(200).json({
        success: true,
        data: affectedAgents,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get affected agents error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get affected agents',
        timestamp: new Date().toISOString()
      });
    }
  }
}