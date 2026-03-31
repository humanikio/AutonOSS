import express from 'express';
import { authenticateToken } from '../../middleware/auth';
import { chatAgent } from '../services/chatAgent';

const router = express.Router();

// Apply authentication middleware to all routes  
router.use(authenticateToken);

/**
 * Get or create chat session for a document (auto-loads most recent or creates new)
 * GET /chat/:docId/current
 */
router.get('/:docId/current', async (req, res) => {
  try {
    const { docId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
      return;
    }

    if (!docId) {
      res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
      return;
    }

    // First, try to get existing chat sessions
    const chats = await chatAgent.listChats(tenantId, docId);
    
    let chatId: string;
    
    if (chats.length > 0) {
      // Use the most recent chat (first in the ordered list)
      chatId = chats[0].id;
      console.log(`Using existing chat session ${chatId} for document ${docId}`);
    } else {
      // No chats exist, create a new one
      const result = await chatAgent.createChat({ tenantId, docId });
      chatId = result.chatId;
      console.log(`Created new chat session ${chatId} for document ${docId}`);
    }

    // Load the chat history for the current chat
    const messages = await chatAgent.loadChatHistory(tenantId, docId, chatId);

    res.status(200).json({
      success: true,
      data: { 
        chatId,
        messages,
        isNewChat: chats.length === 0
      }
    });

  } catch (error) {
    console.error('Error getting current chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current chat session'
    });
  }
});

/**
 * Create a new chat session for a document
 * POST /chat/create
 */
router.post('/create', async (req, res) => {
  try {
    const { docId } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
      return;
    }

    if (!docId) {
      res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
      return;
    }

    const result = await chatAgent.createChat({ tenantId, docId });

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat session'
    });
  }
});

/**
 * Send a message to a chat session
 * POST /chat/message
 */
router.post('/message', async (req, res) => {
  try {
    const { docId, chatId, message } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
      return;
    }

    if (!docId || !chatId || !message) {
      res.status(400).json({
        success: false,
        error: 'Document ID, chat ID, and message are required'
      });
      return;
    }

    const result = await chatAgent.sendMessage({
      tenantId,
      docId,
      chatId,
      message
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * Load chat history for a session
 * GET /chat/:docId/:chatId/history
 */
router.get('/:docId/:chatId/history', async (req, res) => {
  try {
    const { docId, chatId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
      return;
    }

    const messages = await chatAgent.loadChatHistory(tenantId, docId, chatId);

    res.status(200).json({
      success: true,
      data: { messages }
    });

  } catch (error) {
    console.error('Error loading chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load chat history'
    });
  }
});

/**
 * List all chat sessions for a document
 * GET /chat/:docId/sessions
 */
router.get('/:docId/sessions', async (req, res) => {
  try {
    const { docId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
      return;
    }

    const chats = await chatAgent.listChats(tenantId, docId);

    res.status(200).json({
      success: true,
      data: { chats }
    });

  } catch (error) {
    console.error('Error listing chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list chat sessions'
    });
  }
});

/**
 * Delete a chat session
 * DELETE /chat/:docId/:chatId
 */
router.delete('/:docId/:chatId', async (req, res) => {
  try {
    const { docId, chatId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
      return;
    }

    await chatAgent.deleteChat(tenantId, docId, chatId);

    res.status(200).json({
      success: true,
      message: 'Chat session deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chat session'
    });
  }
});

/**
 * Get quick suggestions for the document
 * GET /chat/:docId/suggestions
 */
router.get('/:docId/suggestions', async (req, res) => {
  try {
    const { docId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
      return;
    }

    const suggestions = await chatAgent.getQuickSuggestions(tenantId, docId);

    res.status(200).json({
      success: true,
      data: { suggestions }
    });

  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

export default router;