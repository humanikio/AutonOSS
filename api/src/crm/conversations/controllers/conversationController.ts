import { Request, Response } from 'express';
import { manageConversationsService } from '../services/manageConversations';
import { conversationManager } from '../../../inboundEvents/sms/services/newRequestHandler/manageConversation';

export class ConversationController {
  
  async updateConversation(req: Request, res: Response): Promise<void> {
    try {
      const jwtTenantId = req.tenantId;
      const { tenantId, contactId, conversationId } = req.params;
      const updates = req.body;

      console.log(`🔄 Updating conversation ${conversationId} for contact ${contactId} in tenant ${tenantId}`, updates);

      // Validate required parameters
      if (!tenantId || !contactId || !conversationId) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'tenantId, contactId and conversationId are required'
        });
        return;
      }

      // Validate tenantId matches JWT
      if (jwtTenantId !== tenantId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Tenant ID mismatch'
        });
        return;
      }

      // Validate that we have some updates to make
      if (!updates || Object.keys(updates).length === 0) {
        res.status(400).json({
          error: 'No updates provided',
          message: 'Request body must contain fields to update'
        });
        return;
      }

      await manageConversationsService.updateConversation({
        tenantId,
        contactId,
        conversationId,
        updates
      });

      console.log(`✅ Successfully updated conversation ${conversationId}`);
      
      res.status(200).json({
        success: true,
        message: 'Conversation updated successfully',
        conversationId
      });

    } catch (error) {
      console.error('❌ Error in updateConversation:', error);
      
      if (error instanceof Error && error.message === 'Conversation not found') {
        res.status(404).json({
          error: 'Conversation not found',
          message: 'The specified conversation does not exist'
        });
        return;
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  async toggleStar(req: Request, res: Response): Promise<void> {
    try {
      const jwtTenantId = req.tenantId;
      const { tenantId, contactId, conversationId } = req.params;

      console.log(`⭐ Toggling star for conversation ${conversationId}`);

      // Validate required parameters
      if (!tenantId || !contactId || !conversationId) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'tenantId, contactId and conversationId are required'
        });
        return;
      }

      // Validate tenantId matches JWT
      if (jwtTenantId !== tenantId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Tenant ID mismatch'
        });
        return;
      }

      const isStarred = await manageConversationsService.toggleStar(tenantId, contactId, conversationId);

      console.log(`✅ Successfully toggled star for conversation ${conversationId}`);
      
      res.status(200).json({
        success: true,
        message: `Conversation ${isStarred ? 'starred' : 'unstarred'} successfully`,
        conversationId,
        isStarred
      });

    } catch (error) {
      console.error('❌ Error in toggleStar:', error);
      
      if (error instanceof Error && error.message === 'Conversation not found') {
        res.status(404).json({
          error: 'Conversation not found',
          message: 'The specified conversation does not exist'
        });
        return;
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const jwtTenantId = req.tenantId;
      const { tenantId, contactId, conversationId } = req.params;

      console.log(`📖 Getting conversation ${conversationId} for contact ${contactId} in tenant ${tenantId}`);

      // Validate required parameters
      if (!tenantId || !contactId || !conversationId) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'tenantId, contactId and conversationId are required'
        });
        return;
      }

      // Validate tenantId matches JWT
      if (jwtTenantId !== tenantId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Tenant ID mismatch'
        });
        return;
      }

      const conversation = await manageConversationsService.getConversation(tenantId, contactId, conversationId);

      console.log(`✅ Successfully retrieved conversation ${conversationId}`);
      
      res.status(200).json({
        success: true,
        conversation
      });

    } catch (error) {
      console.error('❌ Error in getConversation:', error);
      
      if (error instanceof Error && error.message === 'Conversation not found') {
        res.status(404).json({
          error: 'Conversation not found',
          message: 'The specified conversation does not exist'
        });
        return;
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const jwtTenantId = req.tenantId;
      const { tenantId, contactId, conversationId } = req.params;

      console.log(`📖 Marking conversation ${conversationId} as read for contact ${contactId} in tenant ${tenantId}`);

      // Validate required parameters
      if (!tenantId || !contactId || !conversationId) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'tenantId, contactId and conversationId are required'
        });
        return;
      }

      // Validate tenantId matches JWT
      if (jwtTenantId !== tenantId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Tenant ID mismatch'
        });
        return;
      }

      await conversationManager.markConversationAsRead(tenantId, contactId, conversationId);

      console.log(`✅ Successfully marked conversation ${conversationId} as read`);
      
      res.status(200).json({
        success: true,
        message: 'Conversation marked as read successfully',
        conversationId
      });

    } catch (error) {
      console.error('❌ Error in markAsRead:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Conversation not found',
          message: 'The specified conversation does not exist'
        });
        return;
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }


}

export const conversationController = new ConversationController();