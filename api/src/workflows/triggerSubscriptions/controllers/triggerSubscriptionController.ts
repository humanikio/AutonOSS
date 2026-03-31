/**
 * Trigger Subscription Controller
 * Handles HTTP requests for trigger subscription CRUD operations
 */

import { Request, Response } from 'express';
import { triggerSubscriptionManager } from '../services/triggerSubscriptionManager';
import { CreateSubscriptionInput, UpdateSubscriptionInput, SubscriptionFilters } from '../types';
import { executeTrigger } from '../services/triggerExecutions';

export class TriggerSubscriptionController {
  /**
   * Create a new trigger subscription
   * POST /api/workflows/trigger-subscriptions
   */
  async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      // Get tenantId from middleware (injected from API key or JWT)
      const tenantId = (req as any).tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: tenantId is required'
        });
        return;
      }

      const input: CreateSubscriptionInput = req.body;

      // Validate required fields
      if (!input.workflowId || !input.triggerType) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: workflowId and triggerType are required'
        });
        return;
      }

      const subscription = await triggerSubscriptionManager.createSubscription(tenantId, input);

      res.status(201).json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('❌ Error creating subscription:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get trigger subscriptions with filters
   * GET /api/workflows/trigger-subscriptions
   * Query params: triggerType, enabled, workflowId
   */
  async getSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      // Get tenantId from middleware
      const tenantId = (req as any).tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: tenantId is required'
        });
        return;
      }

      // Build filters from query params
      const filters: SubscriptionFilters = {
        triggerType: req.query.triggerType as string,
        workflowId: req.query.workflowId as string,
        enabled: req.query.enabled === 'true' ? true : req.query.enabled === 'false' ? false : undefined
      };

      const subscriptions = await triggerSubscriptionManager.getSubscriptions(tenantId, filters);

      res.status(200).json({
        success: true,
        data: subscriptions,
        count: subscriptions.length
      });
    } catch (error) {
      console.error('❌ Error getting subscriptions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a specific subscription by ID
   * GET /api/workflows/trigger-subscriptions/:subscriptionId
   */
  async readSubscription(req: Request, res: Response): Promise<void> {
    try {
      // Get tenantId from middleware
      const tenantId = (req as any).tenantId;
      const { subscriptionId } = req.params;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: tenantId is required'
        });
        return;
      }

      if (!subscriptionId) {
        res.status(400).json({
          success: false,
          error: 'subscriptionId is required'
        });
        return;
      }

      const subscription = await triggerSubscriptionManager.readSubscription(tenantId, subscriptionId);

      if (!subscription) {
        res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('❌ Error reading subscription:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update a subscription
   * PUT /api/workflows/trigger-subscriptions/:subscriptionId
   */
  async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      // Get tenantId from middleware
      const tenantId = (req as any).tenantId;
      const { subscriptionId } = req.params;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: tenantId is required'
        });
        return;
      }

      if (!subscriptionId) {
        res.status(400).json({
          success: false,
          error: 'subscriptionId is required'
        });
        return;
      }

      const input: UpdateSubscriptionInput = req.body;

      const subscription = await triggerSubscriptionManager.updateSubscription(
        tenantId,
        subscriptionId,
        input
      );

      res.status(200).json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('❌ Error updating subscription:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a subscription
   * DELETE /api/workflows/trigger-subscriptions/:subscriptionId
   */
  async deleteSubscription(req: Request, res: Response): Promise<void> {
    try {
      // Get tenantId from middleware
      const tenantId = (req as any).tenantId;
      const { subscriptionId } = req.params;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: tenantId is required'
        });
        return;
      }

      if (!subscriptionId) {
        res.status(400).json({
          success: false,
          error: 'subscriptionId is required'
        });
        return;
      }

      await triggerSubscriptionManager.deleteSubscription(tenantId, subscriptionId);

      res.status(200).json({
        success: true,
        message: 'Subscription deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting subscription:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Execute trigger subscriptions
   * POST /api/workflows/trigger-subscriptions/execute
   */
  async executeSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      // Get tenantId from authentication middleware
      const tenantId = (req as any).tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: tenantId is required'
        });
        return;
      }

      const { triggerType, payload } = req.body;

      // Validate required fields
      if (!triggerType || !payload) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: triggerType and payload are required'
        });
        return;
      }

      // Call service with tenantId from auth + payload from request body
      const result = await executeTrigger({ tenantId, triggerType, payload });

      res.status(200).json({
        success: result.success,
        data: result
      });
    } catch (error) {
      console.error('❌ Error executing trigger:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const triggerSubscriptionController = new TriggerSubscriptionController();
