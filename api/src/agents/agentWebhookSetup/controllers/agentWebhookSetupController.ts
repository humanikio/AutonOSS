import { Request, Response } from 'express';
import { inboundSmsHookSetup } from '../services/sms/inboundSmsHookSetup';
import { outboundSmsHookSetup } from '../services/sms/outboundSmsHookSetup';
import { inboundEmailHookSetup } from '../services/email/inboundEmailHookSetup';
import { outboundPhoneHookSetup } from '../services/phone/outboundPhoneHookSetup';
import { validateActionId } from '../utils/getActionConfig';
import { deleteWebhookService } from '../services/deleteWebhook';

interface WebhookSetupRequest {
  agentId: string;
  tenantId: string;
  actionId: string;
  name?: string;
  description?: string;
}

export class AgentWebhookSetupController {
  // SMS Controllers
  async createSmsInboundWebhook(req: Request, res: Response) {
    try {
      const { agentId, tenantId, actionId, name, description }: WebhookSetupRequest = req.body;

      if (!agentId || !tenantId || !actionId) {
        return res.status(400).json({
          error: 'Missing required fields: agentId, tenantId, and actionId are required'
        });
      }

      // Validate that the action exists and is active
      console.log(`🔍 SMS Inbound Webhook: Validating action ${actionId} for tenant ${tenantId}`);
      const isValidAction = await validateActionId(actionId, tenantId);
      if (!isValidAction) {
        console.log(`❌ SMS Inbound Webhook: Action validation failed for ${actionId}`);
        return res.status(400).json({
          error: `Invalid or inactive action: ${actionId}. Please ensure the action exists and is active.`
        });
      }
      console.log(`✅ SMS Inbound Webhook: Action validation passed for ${actionId}`);

      const result = await inboundSmsHookSetup.createWebhook({
        agentId,
        tenantId,
        actionId,
        name,
        description
      });

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error creating SMS inbound webhook:', error);
      return res.status(500).json({
        error: 'Failed to create SMS inbound webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createSmsOutboundWebhook(req: Request, res: Response) {
    try {
      const { agentId, tenantId, actionId, name, description }: WebhookSetupRequest = req.body;

      if (!agentId || !tenantId || !actionId) {
        return res.status(400).json({
          error: 'Missing required fields: agentId, tenantId, and actionId are required'
        });
      }

      // Validate that the action exists and is active
      const isValidAction = await validateActionId(actionId, tenantId);
      if (!isValidAction) {
        return res.status(400).json({
          error: `Invalid or inactive action: ${actionId}`
        });
      }

      const result = await outboundSmsHookSetup.createWebhook({
        agentId,
        tenantId,
        actionId,
        name,
        description
      });

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error creating SMS outbound webhook:', error);
      return res.status(500).json({
        error: 'Failed to create SMS outbound webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Email Controllers
  async createEmailInboundWebhook(req: Request, res: Response) {
    try {
      const { agentId, tenantId, actionId, name, description }: WebhookSetupRequest = req.body;

      if (!agentId || !tenantId || !actionId) {
        return res.status(400).json({
          error: 'Missing required fields: agentId, tenantId, and actionId are required'
        });
      }

      // Validate that the action exists and is active
      const isValidAction = await validateActionId(actionId, tenantId);
      if (!isValidAction) {
        return res.status(400).json({
          error: `Invalid or inactive action: ${actionId}`
        });
      }

      const result = await inboundEmailHookSetup.createWebhook({
        agentId,
        tenantId,
        actionId,
        name,
        description
      });

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error creating email inbound webhook:', error);
      return res.status(500).json({
        error: 'Failed to create email inbound webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createEmailOutboundWebhook(req: Request, res: Response) {
    try {
      const { agentId, tenantId, actionId, name, description }: WebhookSetupRequest = req.body;

      if (!agentId || !tenantId || !actionId) {
        return res.status(400).json({
          error: 'Missing required fields: agentId, tenantId, and actionId are required'
        });
      }

      // Validate that the action exists and is active
      const isValidAction = await validateActionId(actionId, tenantId);
      if (!isValidAction) {
        return res.status(400).json({
          error: `Invalid or inactive action: ${actionId}`
        });
      }

      // TODO: Implement outbound email webhook setup service
      return res.status(501).json({
        error: 'Email outbound webhook setup not yet implemented'
      });
    } catch (error) {
      console.error('Error creating email outbound webhook:', error);
      return res.status(500).json({
        error: 'Failed to create email outbound webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Phone Controllers
  async createPhoneInboundWebhook(req: Request, res: Response) {
    try {
      const { agentId, tenantId, actionId, name, description }: WebhookSetupRequest = req.body;

      if (!agentId || !tenantId || !actionId) {
        return res.status(400).json({
          error: 'Missing required fields: agentId, tenantId, and actionId are required'
        });
      }

      // Validate that the action exists and is active
      const isValidAction = await validateActionId(actionId, tenantId);
      if (!isValidAction) {
        return res.status(400).json({
          error: `Invalid or inactive action: ${actionId}`
        });
      }

      // TODO: Implement inbound phone webhook setup service
      return res.status(501).json({
        error: 'Phone inbound webhook setup not yet implemented'
      });
    } catch (error) {
      console.error('Error creating phone inbound webhook:', error);
      return res.status(500).json({
        error: 'Failed to create phone inbound webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createPhoneOutboundWebhook(req: Request, res: Response) {
    try {
      const { agentId, tenantId, actionId, name, description }: WebhookSetupRequest = req.body;

      if (!agentId || !tenantId || !actionId) {
        return res.status(400).json({
          error: 'Missing required fields: agentId, tenantId, and actionId are required'
        });
      }

      // Validate that the action exists and is active
      const isValidAction = await validateActionId(actionId, tenantId);
      if (!isValidAction) {
        return res.status(400).json({
          error: `Invalid or inactive action: ${actionId}`
        });
      }

      const result = await outboundPhoneHookSetup.createWebhook({
        agentId,
        tenantId,
        actionId,
        name,
        description
      });

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error creating phone outbound webhook:', error);
      return res.status(500).json({
        error: 'Failed to create phone outbound webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Webhook Deletion Controllers
  async deleteWebhook(req: Request, res: Response) {
    try {
      const { webhookId, tenantId, agentId } = req.params;

      if (!webhookId || !tenantId || !agentId) {
        return res.status(400).json({
          error: 'Missing required parameters: webhookId, tenantId, and agentId are required'
        });
      }

      const result = await deleteWebhookService.deleteWebhook({
        webhookId,
        tenantId,
        agentId
      });

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: result.deletedWebhook
        });
      } else {
        return res.status(404).json({
          success: false,
          error: result.message
        });
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return res.status(500).json({
        error: 'Failed to delete webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deactivateWebhook(req: Request, res: Response) {
    try {
      const { webhookId, tenantId, agentId } = req.params;

      if (!webhookId || !tenantId || !agentId) {
        return res.status(400).json({
          error: 'Missing required parameters: webhookId, tenantId, and agentId are required'
        });
      }

      const result = await deleteWebhookService.deactivateWebhook({
        webhookId,
        tenantId,
        agentId
      });

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: result.deletedWebhook
        });
      } else {
        return res.status(404).json({
          success: false,
          error: result.message
        });
      }
    } catch (error) {
      console.error('Error deactivating webhook:', error);
      return res.status(500).json({
        error: 'Failed to deactivate webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async bulkDeleteWebhooks(req: Request, res: Response) {
    try {
      const { tenantId, agentId } = req.params;
      const { webhookIds } = req.body;

      if (!tenantId || !agentId) {
        return res.status(400).json({
          error: 'Missing required parameters: tenantId and agentId are required'
        });
      }

      if (!webhookIds || !Array.isArray(webhookIds) || webhookIds.length === 0) {
        return res.status(400).json({
          error: 'webhookIds must be a non-empty array'
        });
      }

      const result = await deleteWebhookService.bulkDeleteWebhooks(
        tenantId,
        agentId,
        webhookIds
      );

      return res.status(200).json({
        success: result.success,
        message: `Bulk delete completed: ${result.successCount} successful, ${result.failureCount} failed`,
        data: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          results: result.results
        }
      });
    } catch (error) {
      console.error('Error bulk deleting webhooks:', error);
      return res.status(500).json({
        error: 'Failed to bulk delete webhooks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const agentWebhookSetupController = new AgentWebhookSetupController();