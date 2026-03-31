import { Request, Response } from 'express';
import { destinationHookSetup } from '../services/destinationHookSetup';
import { sendTest } from '../services/sendTest';

interface DestinationWebhookSetupRequest {
  name: string;
  description?: string;
  endpoint: {
    url: string;
    method: 'POST';
    headers?: Record<string, string>;
    authType: 'none' | 'bearer' | 'basic' | 'api_key' | 'signing_secret';
    authConfig?: {
      token?: string;
      username?: string;
      password?: string;
      apiKey?: string;
      apiKeyHeader?: string;
    };
  };
  payloadTemplate?: string;
  isActive?: boolean;
  destinationKey?: string; // For updates - if provided, update existing webhook
}

export class DestinationHookController {
  /**
   * Setup SMS destination webhook
   */
  async setupSmsDestination(req: Request, res: Response) {
    try {
      const { tenantId, agentId } = req.params;
      const setupData: DestinationWebhookSetupRequest = req.body;

      console.log(`=' Setting up SMS destination webhook for agent ${agentId}`);
      console.log(`=� Configuration:`, {
        name: setupData.name,
        url: setupData.endpoint.url,
        authType: setupData.endpoint.authType
      });

      const result = await destinationHookSetup.setupSmsDestination({
        tenantId,
        agentId,
        category: 'sms',
        ...setupData
      });

      if (!result.success) {
        console.error('L SMS destination setup failed:', result.error);
        res.status(500).json({
          success: false,
          error: 'SMS destination setup failed',
          message: result.error
        });
        return;
      }

      console.log(` SMS destination webhook created: ${result.destinationKey}`);

      res.status(200).json({
        success: true,
        message: 'SMS destination webhook created successfully',
        data: {
          destinationKey: result.destinationKey,
          category: 'sms',
          name: setupData.name,
          endpoint: setupData.endpoint.url,
          isActive: result.isActive,
          createdAt: result.createdAt
        }
      });

    } catch (error) {
      console.error('L SMS destination setup error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Setup Email destination webhook
   */
  async setupEmailDestination(req: Request, res: Response) {
    try {
      const { tenantId, agentId } = req.params;
      const setupData: DestinationWebhookSetupRequest = req.body;

      console.log(`=' Setting up Email destination webhook for agent ${agentId}`);

      const result = await destinationHookSetup.setupEmailDestination({
        tenantId,
        agentId,
        category: 'email',
        ...setupData
      });

      if (!result.success) {
        console.error('L Email destination setup failed:', result.error);
        res.status(500).json({
          success: false,
          error: 'Email destination setup failed',
          message: result.error
        });
        return;
      }

      console.log(` Email destination webhook created: ${result.destinationKey}`);

      res.status(200).json({
        success: true,
        message: 'Email destination webhook created successfully',
        data: {
          destinationKey: result.destinationKey,
          category: 'email',
          name: setupData.name,
          endpoint: setupData.endpoint.url,
          isActive: result.isActive,
          createdAt: result.createdAt
        }
      });

    } catch (error) {
      console.error('L Email destination setup error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Setup Phone destination webhook
   */
  async setupPhoneDestination(req: Request, res: Response) {
    try {
      const { tenantId, agentId } = req.params;
      const setupData: DestinationWebhookSetupRequest = req.body;

      console.log(`=' Setting up Phone destination webhook for agent ${agentId}`);

      const result = await destinationHookSetup.setupPhoneDestination({
        tenantId,
        agentId,
        category: 'phone',
        ...setupData
      });

      if (!result.success) {
        console.error('L Phone destination setup failed:', result.error);
        res.status(500).json({
          success: false,
          error: 'Phone destination setup failed',
          message: result.error
        });
        return;
      }

      console.log(` Phone destination webhook created: ${result.destinationKey}`);

      res.status(200).json({
        success: true,
        message: 'Phone destination webhook created successfully',
        data: {
          destinationKey: result.destinationKey,
          category: 'phone',
          name: setupData.name,
          endpoint: setupData.endpoint.url,
          isActive: result.isActive,
          createdAt: result.createdAt
        }
      });

    } catch (error) {
      console.error('L Phone destination setup error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a specific destination webhook by key
   */
  async getDestinationWebhook(req: Request, res: Response) {
    try {
      const { tenantId, agentId, destinationKey } = req.params;

      console.log(`📋 Getting destination webhook: ${destinationKey} for agent ${agentId}`);

      const result = await destinationHookSetup.getDestinationWebhook(tenantId, agentId, destinationKey);

      if (!result.success) {
        console.error('❌ Failed to get destination webhook:', result.error);
        res.status(500).json({
          success: false,
          error: 'Failed to get destination webhook',
          message: result.error
        });
        return;
      }

      if (!result.webhook) {
        console.log(`📋 Destination webhook not found: ${destinationKey}`);
        res.status(404).json({
          success: false,
          error: 'Destination webhook not found',
          message: 'The requested destination webhook does not exist'
        });
        return;
      }

      console.log(`✅ Found destination webhook: ${destinationKey}`);

      res.status(200).json({
        success: true,
        message: 'Destination webhook retrieved successfully',
        data: {
          webhook: result.webhook
        }
      });

    } catch (error) {
      console.error('❌ Get destination webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all destination webhooks for an agent
   */
  async getDestinationWebhooks(req: Request, res: Response) {
    try {
      const { tenantId, agentId } = req.params;

      console.log(`=� Getting destination webhooks for agent ${agentId}`);

      const result = await destinationHookSetup.getDestinationWebhooks(tenantId, agentId);

      if (!result.success) {
        console.error('L Failed to get destination webhooks:', result.error);
        res.status(500).json({
          success: false,
          error: 'Failed to get destination webhooks',
          message: result.error
        });
        return;
      }

      console.log(` Found ${result.webhooks?.length || 0} destination webhooks`);

      res.status(200).json({
        success: true,
        message: 'Destination webhooks retrieved successfully',
        data: {
          webhooks: result.webhooks || [],
          count: result.webhooks?.length || 0
        }
      });

    } catch (error) {
      console.error('L Get destination webhooks error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a destination webhook
   */
  async deleteDestination(req: Request, res: Response) {
    try {
      const { tenantId, agentId, destinationKey } = req.params;

      console.log(`=� Deleting destination webhook: ${destinationKey}`);

      const result = await destinationHookSetup.deleteDestination(tenantId, agentId, destinationKey);

      if (!result.success) {
        console.error('L Failed to delete destination webhook:', result.error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete destination webhook',
          message: result.error
        });
        return;
      }

      console.log(` Destination webhook deleted: ${destinationKey}`);

      res.status(200).json({
        success: true,
        message: 'Destination webhook deleted successfully',
        data: {
          destinationKey
        }
      });

    } catch (error) {
      console.error('L Delete destination webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Toggle destination webhook active state
   */
  async toggleDestinationActive(req: Request, res: Response) {
    try {
      const { tenantId, agentId, destinationKey } = req.params;
      const { isActive } = req.body;

      console.log(`= Toggling destination webhook ${destinationKey} to ${isActive ? 'active' : 'inactive'}`);

      const result = await destinationHookSetup.toggleDestinationActive(tenantId, agentId, destinationKey, isActive);

      if (!result.success) {
        console.error('L Failed to toggle destination webhook:', result.error);
        res.status(500).json({
          success: false,
          error: 'Failed to toggle destination webhook',
          message: result.error
        });
        return;
      }

      console.log(` Destination webhook ${destinationKey} is now ${isActive ? 'active' : 'inactive'}`);

      res.status(200).json({
        success: true,
        message: `Destination webhook ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: {
          destinationKey,
          isActive: result.isActive
        }
      });

    } catch (error) {
      console.error('L Toggle destination webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test destination webhook
   */
  async testDestinationWebhook(req: Request, res: Response) {
    try {
      const { tenantId, agentId, destinationKey } = req.params;
      const { customPayload } = req.body;

      console.log(`🧪 Testing destination webhook: ${destinationKey}`);

      // First get the webhook details
      const webhookResult = await destinationHookSetup.getDestinationWebhook(tenantId, agentId, destinationKey);

      if (!webhookResult.success || !webhookResult.webhook) {
        console.error('❌ Webhook not found for testing:', destinationKey);
        res.status(404).json({
          success: false,
          error: 'Webhook not found',
          message: 'The destination webhook does not exist or is not accessible'
        });
        return;
      }

      const webhook = webhookResult.webhook;

      // Send test webhook
      const testResult = await sendTest.sendTestWebhook({
        destinationKey,
        category: webhook.category,
        webhookUrl: webhook.endpoint.url,
        customPayload,
        authType: webhook.endpoint.authType,
        signingSecret: webhook.signingSecret
      });

      if (!testResult.success) {
        console.error('❌ Test webhook failed:', testResult.error);
        res.status(500).json({
          success: false,
          error: 'Test webhook failed',
          message: testResult.error,
          data: {
            statusCode: testResult.statusCode,
            response: testResult.response
          }
        });
        return;
      }

      console.log(`✅ Test webhook completed successfully for: ${destinationKey}`);

      res.status(200).json({
        success: true,
        message: 'Test webhook sent successfully',
        data: {
          destinationKey,
          statusCode: testResult.statusCode,
          response: testResult.response,
          timeTaken: testResult.timeTaken
        }
      });

    } catch (error) {
      console.error('❌ Test destination webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const destinationHookController = new DestinationHookController();