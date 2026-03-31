/**
 * Custom Field Groups Controller
 * Handles HTTP requests for field group CRUD operations
 */

import { Request, Response } from 'express';
import { fieldGroupManager } from '../services/customFieldGroupCrud';
import {
  CreateFieldGroupRequest,
  UpdateFieldGroupRequest,
  GetFieldGroupsQuery,
  EntityScope,
} from '../types';

export class CustomFieldGroupsController {
  /**
   * GET /api/customFields/groups
   * Get all field groups for tenant with optional filters
   */
  async getAllGroups(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      // Parse query parameters
      const query: GetFieldGroupsQuery = {
        entityScope: req.query.entityScope as EntityScope | undefined,
      };

      const groups = await fieldGroupManager.getAllGroups(tenantId, query);

      res.status(200).json({
        success: true,
        data: groups,
        count: groups.length,
      });
    } catch (error) {
      console.error('Error in getAllGroups controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/customFields/groups/:groupId
   * Get single field group by ID
   */
  async getGroup(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      const { groupId } = req.params;

      const group = await fieldGroupManager.getGroup(tenantId, groupId);

      if (!group) {
        res.status(404).json({
          success: false,
          error: 'Field group not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      console.error('Error in getGroup controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/customFields/groups
   * Create new field group
   */
  async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      const data: CreateFieldGroupRequest = req.body;

      // Validate required fields
      if (!data.name || !data.displayName || !data.entityScope) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: name, displayName, entityScope',
        });
        return;
      }

      const group = await fieldGroupManager.createGroup(tenantId, data);

      res.status(201).json({
        success: true,
        data: group,
        message: 'Field group created successfully',
      });
    } catch (error) {
      console.error('Error in createGroup controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/customFields/groups/:groupId
   * Update field group
   */
  async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      const { groupId } = req.params;
      const data: UpdateFieldGroupRequest = req.body;

      const group = await fieldGroupManager.updateGroup(tenantId, groupId, data);

      res.status(200).json({
        success: true,
        data: group,
        message: 'Field group updated successfully',
      });
    } catch (error) {
      console.error('Error in updateGroup controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/customFields/groups/:groupId
   * Delete field group
   */
  async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      const { groupId } = req.params;

      await fieldGroupManager.deleteGroup(tenantId, groupId);

      res.status(200).json({
        success: true,
        message: 'Field group deleted successfully. Fields using this group will appear as ungrouped.',
        groupId,
      });
    } catch (error) {
      console.error('Error in deleteGroup controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const customFieldGroupsController = new CustomFieldGroupsController();
