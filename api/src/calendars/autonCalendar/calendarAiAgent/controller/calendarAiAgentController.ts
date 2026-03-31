/**
 * Calendar AI Agent Controller
 * HTTP request handlers for AI agent endpoints
 */

import { Request, Response } from 'express';
import { requestOrchestrator } from '../orchrestrators/requestOrchrestrator';
import {
  getCurrentChat,
  listChats,
  createChat,
  changeCurrentChat,
  updateChat,
  deleteChat,
  getChatMessages,
  type CreateChatInput
} from '../state/chats';
import {
  getCurrentCycle,
  listCycles
} from '../state/cycles';

/**
 * Send message to AI agent
 * POST /api/calendar-agent/send-message
 *
 * Body: { prompt: string, chatId?: string, calendarId?: string }
 */
export async function sendMessageController(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - tenantId required'
      });
    }

    const { prompt, chatId, calendarId } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'prompt is required and must be a string'
      });
    }

    console.log(`=è Send message request from tenant ${tenantId}`);

    // Process message through orchestrator
    const result = await requestOrchestrator({
      tenantId,
      prompt,
      chatId,
      calendarId
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('L Send message controller error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get current chat
 * GET /api/calendar-agent/chat/current
 */
export async function getCurrentChatController(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const chat = await getCurrentChat(tenantId);

    if (!chat) {
      return res.status(404).json({ error: 'No current chat found' });
    }

    return res.status(200).json({ chat });
  } catch (error: any) {
    console.error('L Get current chat error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * List all chats
 * GET /api/calendar-agent/chats
 */
export async function listChatsController(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const chats = await listChats(tenantId);

    return res.status(200).json({ chats });
  } catch (error: any) {
    console.error('L List chats error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Create new chat
 * POST /api/calendar-agent/chats
 *
 * Body: { name?: string, metadata?: object }
 */
export async function createChatController(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, metadata } = req.body;

    const input: CreateChatInput = {};
    if (name) input.name = name;
    if (metadata) input.metadata = metadata;

    const chat = await createChat(tenantId, input);

    return res.status(201).json({ chat });
  } catch (error: any) {
    console.error('L Create chat error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Change current chat
 * POST /api/calendar-agent/chat/current
 *
 * Body: { chatId: string }
 */
export async function changeCurrentChatController(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    await changeCurrentChat(tenantId, chatId);

    return res.status(200).json({
      success: true,
      message: 'Current chat changed'
    });
  } catch (error: any) {
    console.error('L Change current chat error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Update chat
 * PUT /api/calendar-agent/chats/:chatId
 *
 * Body: { name?: string, metadata?: object }
 */
export async function updateChatController(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const { chatId } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, metadata } = req.body;

    const chat = await updateChat(tenantId, chatId, { name, metadata });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    return res.status(200).json({ chat });
  } catch (error: any) {
    console.error('L Update chat error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Delete chat
 * DELETE /api/calendar-agent/chats/:chatId
 */
export async function deleteChatController(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const { chatId } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const deleted = await deleteChat(tenantId, chatId);

    if (!deleted) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Chat deleted'
    });
  } catch (error: any) {
    console.error('L Delete chat error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Get chat messages
 * GET /api/calendar-agent/chats/:chatId/messages
 *
 * Query params: limit (optional)
 */
export async function getChatMessagesController(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const { chatId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messages = await getChatMessages(tenantId, chatId, limit);

    return res.status(200).json({ messages });
  } catch (error: any) {
    console.error('L Get chat messages error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Get current cycle
 * GET /api/calendar-agent/cycle/current
 */
export async function getCurrentCycleController(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cycle = await getCurrentCycle(tenantId);

    if (!cycle) {
      return res.status(404).json({ error: 'No current cycle found' });
    }

    return res.status(200).json({ cycle });
  } catch (error: any) {
    console.error('L Get current cycle error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * List all cycles
 * GET /api/calendar-agent/cycles
 *
 * Query params: limit (optional)
 */
export async function listCyclesController(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cycles = await listCycles(tenantId, limit);

    return res.status(200).json({ cycles });
  } catch (error: any) {
    console.error('L List cycles error:', error);
    return res.status(500).json({ error: error.message });
  }
}
