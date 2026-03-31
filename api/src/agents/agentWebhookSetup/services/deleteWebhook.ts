import { firestore } from '../../../config/firebase';

interface DeleteWebhookParams {
  webhookId: string;
  tenantId: string;
  agentId: string;
}

interface DeleteWebhookResult {
  success: boolean;
  message: string;
  deletedWebhook?: {
    webhookId: string;
    name: string;
    channel: string;
    method: string;
  };
}

export class DeleteWebhookService {
  /**
   * Delete a webhook by webhookId
   */
  async deleteWebhook(params: DeleteWebhookParams): Promise<DeleteWebhookResult> {
    try {
      const { webhookId, tenantId, agentId } = params;
      
      console.log(`🗑️ Deleting webhook: ${webhookId} for agent: ${agentId}`);
      
      // First, get the webhook document to verify it exists and get details
      const webhookRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId)
        .collection('webhooks').doc(webhookId);
      
      const webhookDoc = await webhookRef.get();
      
      if (!webhookDoc.exists) {
        console.log(`❌ Webhook not found: ${webhookId}`);
        return {
          success: false,
          message: `Webhook ${webhookId} not found`
        };
      }
      
      const webhookData = webhookDoc.data();
      
      // Verify this webhook belongs to the correct tenant and agent
      if (webhookData?.tenantId !== tenantId || webhookData?.agentId !== agentId) {
        console.log(`❌ Webhook ownership verification failed for: ${webhookId}`);
        return {
          success: false,
          message: 'Unauthorized: Webhook does not belong to this agent/tenant'
        };
      }
      
      // Store webhook details before deletion
      const deletedWebhookDetails = {
        webhookId: webhookData.webhookId || webhookId,
        name: webhookData.name || 'Unnamed Webhook',
        channel: webhookData.channel || 'unknown',
        method: webhookData.method || 'unknown'
      };
      
      // Delete the webhook document
      await webhookRef.delete();
      
      console.log(`✅ Successfully deleted webhook: ${webhookId}`);
      console.log(`   - Name: ${deletedWebhookDetails.name}`);
      console.log(`   - Type: ${deletedWebhookDetails.channel} ${deletedWebhookDetails.method}`);
      
      return {
        success: true,
        message: `Webhook "${deletedWebhookDetails.name}" deleted successfully`,
        deletedWebhook: deletedWebhookDetails
      };
      
    } catch (error) {
      console.error(`❌ Error deleting webhook ${params.webhookId}:`, error);
      
      return {
        success: false,
        message: `Failed to delete webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Soft delete a webhook (mark as inactive instead of deleting)
   */
  async deactivateWebhook(params: DeleteWebhookParams): Promise<DeleteWebhookResult> {
    try {
      const { webhookId, tenantId, agentId } = params;
      
      console.log(`⏸️ Deactivating webhook: ${webhookId} for agent: ${agentId}`);
      
      const webhookRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId)
        .collection('webhooks').doc(webhookId);
      
      const webhookDoc = await webhookRef.get();
      
      if (!webhookDoc.exists) {
        return {
          success: false,
          message: `Webhook ${webhookId} not found`
        };
      }
      
      const webhookData = webhookDoc.data();
      
      // Verify ownership
      if (webhookData?.tenantId !== tenantId || webhookData?.agentId !== agentId) {
        return {
          success: false,
          message: 'Unauthorized: Webhook does not belong to this agent/tenant'
        };
      }
      
      // Update to inactive
      await webhookRef.update({
        isActive: false,
        deactivatedAt: new Date(),
        updatedAt: new Date()
      });
      
      const webhookDetails = {
        webhookId: webhookData.webhookId || webhookId,
        name: webhookData.name || 'Unnamed Webhook',
        channel: webhookData.channel || 'unknown',
        method: webhookData.method || 'unknown'
      };
      
      console.log(`✅ Successfully deactivated webhook: ${webhookId}`);
      
      return {
        success: true,
        message: `Webhook "${webhookDetails.name}" deactivated successfully`,
        deletedWebhook: webhookDetails
      };
      
    } catch (error) {
      console.error(`❌ Error deactivating webhook ${params.webhookId}:`, error);
      
      return {
        success: false,
        message: `Failed to deactivate webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Bulk delete multiple webhooks
   */
  async bulkDeleteWebhooks(
    tenantId: string, 
    agentId: string, 
    webhookIds: string[]
  ): Promise<{
    success: boolean;
    results: DeleteWebhookResult[];
    successCount: number;
    failureCount: number;
  }> {
    console.log(`🗑️ Bulk deleting ${webhookIds.length} webhooks for agent: ${agentId}`);
    
    const results: DeleteWebhookResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (const webhookId of webhookIds) {
      const result = await this.deleteWebhook({ webhookId, tenantId, agentId });
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
    
    console.log(`✅ Bulk delete completed: ${successCount} success, ${failureCount} failed`);
    
    return {
      success: successCount > 0,
      results,
      successCount,
      failureCount
    };
  }
}

export const deleteWebhookService = new DeleteWebhookService();