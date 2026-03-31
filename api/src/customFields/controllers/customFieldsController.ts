/**
 * Custom Fields Controller
 * Handles HTTP requests for custom field CRUD operations
 */

import { Request, Response } from 'express';
import { customFieldManager } from '../services/customFieldManager';
import {
  CreateCustomFieldRequest,
  UpdateCustomFieldRequest,
  GetCustomFieldsQuery,
  EntityScope,
} from '../types';

export class CustomFieldsController {
  /**
   * GET /api/customFields
   * Get all custom fields for tenant with optional filters
   */
  async getAllFields(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      // Parse query parameters
      const query: GetCustomFieldsQuery = {
        entityScope: req.query.entityScope as EntityScope | undefined,
        group: req.query.group as string | undefined,
        includeSystem: req.query.includeSystem === 'true', // Default false - must explicitly opt-in
        excludeInternal: req.query.excludeInternal !== 'false', // Default true - exclude internal fields
      };

      const fields = await customFieldManager.getAllFields(tenantId, query);

      res.status(200).json({
        success: true,
        data: fields,
        count: fields.length,
      });
    } catch (error) {
      console.error('Error in getAllFields controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/customFields/:fieldId
   * Get single custom field by ID
   */
  async getField(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      const { fieldId } = req.params;

      const field = await customFieldManager.getField(tenantId, fieldId);

      if (!field) {
        res.status(404).json({
          success: false,
          error: 'Custom field not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: field,
      });
    } catch (error) {
      console.error('Error in getField controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/customFields
   * Create new custom field
   */
  async createField(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const userId = req.userId || req.user?.uid;

      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      if (!userId) {
        res.status(401).json({ success: false, error: 'User ID not found in request' });
        return;
      }

      const data: CreateCustomFieldRequest = req.body;

      // Validate required fields
      if (!data.name || !data.displayName || !data.type || !data.entityScope) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: name, displayName, type, entityScope',
        });
        return;
      }

      const field = await customFieldManager.createField(tenantId, userId, data);

      res.status(201).json({
        success: true,
        data: field,
        message: 'Custom field created successfully',
      });
    } catch (error) {
      console.error('Error in createField controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/customFields/:fieldId
   * Update custom field
   */
  async updateField(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      const { fieldId } = req.params;
      const data: UpdateCustomFieldRequest = req.body;

      const field = await customFieldManager.updateField(tenantId, fieldId, data);

      res.status(200).json({
        success: true,
        data: field,
        message: 'Custom field updated successfully',
      });
    } catch (error) {
      console.error('Error in updateField controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/customFields/:fieldId
   * Delete custom field
   */
  async deleteField(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      const { fieldId } = req.params;

      await customFieldManager.deleteField(tenantId, fieldId);

      res.status(200).json({
        success: true,
        message: 'Custom field deleted successfully',
        fieldId,
      });
    } catch (error) {
      console.error('Error in deleteField controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/customFields/fields-list
   * Get fields in a simple format for automation nodes
   * Returns array of { name: string, displayName: string } for dropdown options
   */
  async getFieldsList(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      const entityScope = req.query.entityScope as EntityScope;

      if (!entityScope) {
        res.status(400).json({
          success: false,
          error: 'entityScope query parameter is required',
        });
        return;
      }

      // Fetch all fields (system + custom) for the entity scope
      const fields = await customFieldManager.getAllFields(tenantId, {
        entityScope,
        includeSystem: true,
        excludeInternal: true, // Exclude internal fields like id, tenant_id, created_at, updated_at
      });

      // Map to simple format for automation nodes
      const fieldsList = fields.map((field) => ({
        name: field.name,
        displayName: field.displayName,
      }));

      res.status(200).json({
        success: true,
        data: fieldsList,
      });
    } catch (error) {
      console.error('Error in getFieldsList controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/customFields/check-name/:name
   * Check if field name is available
   */
  async checkFieldNameAvailability(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Tenant ID not found in request' });
        return;
      }

      const { name } = req.params;
      const entityScope = req.query.entityScope as EntityScope;

      if (!entityScope) {
        res.status(400).json({
          success: false,
          error: 'entityScope query parameter is required',
        });
        return;
      }

      const isAvailable = await customFieldManager.isFieldNameAvailable(
        tenantId,
        name,
        entityScope
      );

      res.status(200).json({
        success: true,
        data: {
          name,
          entityScope,
          available: isAvailable,
        },
      });
    } catch (error) {
      console.error('Error in checkFieldNameAvailability controller:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const customFieldsController = new CustomFieldsController();
