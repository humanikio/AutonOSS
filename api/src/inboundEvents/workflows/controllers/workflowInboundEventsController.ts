import { Request, Response } from 'express';
import { inboundPostTestPayloadManager } from '../services/inboundPostTestPayloadManager';

export const workflowInboundEventsController = {
  /**
   * Generate a new test URL for a workflow
   * POST /:workflowId/generate-test-url
   */
  async generateTestUrl(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      // Prioritize x-tenant-id header from frontend over JWT-derived tenantId
      const tenantId = (req.headers['x-tenant-id'] as string) || req.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'Authentication required' });
        return;
      }

      if (!workflowId) {
        res.status(400).json({ error: 'Workflow ID is required' });
        return;
      }

      console.log(`📝 Generating test URL - TenantId: ${tenantId}, WorkflowId: ${workflowId}`);
      const result = await inboundPostTestPayloadManager.generateTestUrl(tenantId, workflowId);

      res.status(200).json({
        success: true,
        testUrl: result.testUrl,
        fullUrl: result.fullUrl,
      });
    } catch (error: any) {
      console.error('Error generating test URL:', error);
      res.status(500).json({
        error: 'Failed to generate test URL',
        message: error.message,
      });
    }
  },

  /**
   * Get the active test URL for a workflow
   * GET /:workflowId/test-url
   */
  async getActiveTestUrl(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      // Prioritize x-tenant-id header from frontend over JWT-derived tenantId
      const tenantId = (req.headers['x-tenant-id'] as string) || req.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'Authentication required' });
        return;
      }

      if (!workflowId) {
        res.status(400).json({ error: 'Workflow ID is required' });
        return;
      }

      const result = await inboundPostTestPayloadManager.getActiveTestUrl(tenantId, workflowId);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'No active test URL found for this workflow',
        });
        return;
      }

      // Disable caching - test URL data changes frequently
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      res.status(200).json({
        success: true,
        testUrl: result.testUrl,
        fullUrl: result.fullUrl,
        createdAt: result.createdAt,
      });
    } catch (error: any) {
      console.error('Error fetching active test URL:', error);
      res.status(500).json({
        error: 'Failed to fetch active test URL',
        message: error.message,
      });
    }
  },

  /**
   * Process a test payload received at the public webhook endpoint
   * POST /test/:url
   * (No authentication required)
   */
  async processTestPayload(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.params;
      const payload = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL parameter is required' });
        return;
      }

      await inboundPostTestPayloadManager.processNewRequest(url, payload);

      res.status(200).json({
        success: true,
        message: 'Test payload received and stored',
      });
    } catch (error: any) {
      console.error('Error processing test payload:', error);
      res.status(500).json({
        error: 'Failed to process test payload',
        message: error.message,
      });
    }
  },

  /**
   * Get the latest test payload received for a workflow
   * GET /:workflowId/test-payload/latest
   */
  async getLatestTestPayload(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      // Prioritize x-tenant-id header from frontend over JWT-derived tenantId
      const tenantId = (req.headers['x-tenant-id'] as string) || req.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'Authentication required' });
        return;
      }

      if (!workflowId) {
        res.status(400).json({ error: 'Workflow ID is required' });
        return;
      }

      const result = await inboundPostTestPayloadManager.getLatestTestPayload(tenantId, workflowId);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'No test payload found for this workflow',
        });
        return;
      }

      // Disable caching - payload data changes with each webhook request
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      res.status(200).json({
        success: true,
        payload: result.payload,
        receivedAt: result.receivedAt,
        testUrl: result.testUrl,
      });
    } catch (error: any) {
      console.error('Error fetching latest test payload:', error);
      res.status(500).json({
        error: 'Failed to fetch latest test payload',
        message: error.message,
      });
    }
  },
};
