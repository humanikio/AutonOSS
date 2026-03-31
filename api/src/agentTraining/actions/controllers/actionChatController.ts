import { Request, Response } from 'express';
import { ActionChatManager } from '../memory/ActionChatManager';
import { ActionPromptBuilder } from '../memory/ActionPromptBuilder';
import { ActionResponseHandler } from '../memory/ActionResponseHandler';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Claude calling function with tools support
async function callClaude(prompt: string, options?: {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  tools?: any[];
}): Promise<any> {
  try {
    const {
      model = 'claude-sonnet-4-5-20250929',
      max_tokens = 4000,
      temperature = 0.7,
      tools = []
    } = options || {};

    const response = await anthropic.messages.create({
      model,
      max_tokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      tools: tools.length > 0 ? tools : undefined,
    });

    console.log('🤖 Claude Response:', JSON.stringify(response.content, null, 2));

    // Return the full content array so the response handler can process it properly
    return response.content;
  } catch (error) {
    console.error('Error calling Claude:', error);
    throw error;
  }
}

export const actionChatController = {
  // GET /api/agent-training/actions/:actionId/chat/current
  getCurrentSession: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const { agentId } = req.query;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'agentId is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const chatManager = new ActionChatManager(tenantId, agentId as string, actionId);
      const session = await chatManager.getCurrentSession(userId);

      res.status(200).json({
        success: true,
        data: {
          ...session,
          actualActionId: chatManager.getActionId()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting current session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get current session',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/actions/:actionId/chat/message
  sendMessage: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const { message, agentId, sessionId } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!message || !agentId) {
        res.status(400).json({
          success: false,
          error: 'message and agentId are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Initialize managers
      const chatManager = new ActionChatManager(tenantId, agentId, actionId);
      const promptBuilder = new ActionPromptBuilder(tenantId, agentId, actionId);
      const responseHandler = new ActionResponseHandler(tenantId, agentId, actionId);

      // Get or create session
      let session;
      if (sessionId) {
        session = await chatManager.getSession(sessionId);
        if (!session) {
          throw new Error('Session not found');
        }
      } else {
        session = await chatManager.getCurrentSession(userId);
      }

      // Add user message
      await chatManager.addMessage(session.sessionId, 'user', message);

      // Build prompt with full context
      const prompt = await promptBuilder.buildPrompt(session, message);

      // Call Claude with tools
      const aiResponse = await callClaude(prompt, {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        temperature: 0.7,
        tools: [{
          name: 'actionDraftUpdate',
          description: 'Update the action draft with new information and proposed prompt',
          input_schema: {
            type: 'object',
            properties: {
              proposedPrompt: {
                type: 'string',
                description: 'The main LLM-readable action prompt'
              },
              understanding: {
                type: 'object',
                properties: {
                  summary: { type: 'string', description: 'Brief summary of what the action does' },
                  behavior: { type: 'string', description: 'Detailed description of expected behavior' },
                  tone: { type: 'string', description: 'Tone and style of responses' },
                  keyPoints: { type: 'array', items: { type: 'string' }, description: 'Key points and constraints' },
                  confidence: { type: 'number', description: 'Confidence level 0-100' }
                },
                required: ['summary', 'behavior', 'tone', 'keyPoints', 'confidence']
              },
              clarifyingQuestion: {
                type: 'string',
                description: 'Question to ask user for more details (optional)'
              },
              suggestions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Improvement suggestions (optional)'
              }
            },
            required: ['proposedPrompt', 'understanding']
          }
        }]
      });

      // Process AI response
      const processedResponse = await responseHandler.processResponse(aiResponse);

      // Update session understanding if we got a draft update
      if (processedResponse.draftUpdate) {
        await chatManager.updateSessionUnderstanding(session.sessionId, processedResponse.draftUpdate);
      }

      // Add assistant message
      await chatManager.addMessage(session.sessionId, 'assistant', processedResponse.message, {
        confidence: processedResponse.confidence,
        needsClarification: processedResponse.needsClarification,
        draftUpdate: processedResponse.draftUpdate
      });

      res.status(200).json({
        success: true,
        data: {
          message: processedResponse.message,
          draftUpdate: processedResponse.draftUpdate,
          needsClarification: processedResponse.needsClarification,
          confidence: processedResponse.confidence,
          sessionId: session.sessionId,
          actualActionId: chatManager.getActionId() // Return the actual action ID used
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // GET /api/agent-training/actions/:actionId/chat/sessions
  getAllSessions: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const { agentId } = req.query;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'agentId is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const chatManager = new ActionChatManager(tenantId, agentId as string, actionId);
      const sessions = await chatManager.getAllSessions();

      res.status(200).json({
        success: true,
        data: sessions,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/actions/:actionId/chat/sessions/new
  createNewSession: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const { agentId } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'agentId is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const chatManager = new ActionChatManager(tenantId, agentId, actionId);
      const session = await chatManager.createNewSession(userId);

      res.status(201).json({
        success: true,
        data: session,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // DELETE /api/agent-training/actions/:actionId/chat/sessions/:sessionId
  deleteSession: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId, sessionId } = req.params;
      const { agentId } = req.query;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'agentId is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const chatManager = new ActionChatManager(tenantId, agentId as string, actionId);
      await chatManager.deleteSession(sessionId);

      res.status(200).json({
        success: true,
        message: 'Session deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete session',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/actions/:actionId/chat/sessions/:sessionId/switch
  switchSession: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId, sessionId } = req.params;
      const { agentId } = req.body;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'agentId is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const chatManager = new ActionChatManager(tenantId, agentId, actionId);
      const session = await chatManager.switchToSession(sessionId);

      res.status(200).json({
        success: true,
        data: session,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error switching session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to switch session',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/actions/:actionId/prompt/update-session
  updateSessionPrompt: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const { agentId, prompt, sessionId } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId || !prompt || !sessionId) {
        res.status(400).json({
          success: false,
          error: 'agentId, prompt, and sessionId are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const chatManager = new ActionChatManager(tenantId, agentId, actionId);
      
      // Update the session's current understanding with the new prompt only
      await chatManager.updateSessionUnderstanding(sessionId, {
        proposedPrompt: prompt,
        // Don't pass understanding - let it preserve existing values
        updatedAt: new Date().toISOString()
      });

      console.log(`📝 Session prompt updated directly for ${actionId}/${sessionId}`);

      res.status(200).json({
        success: true,
        message: 'Session prompt updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error updating session prompt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update session prompt',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/actions/:actionId/prompt/update
  updatePrompt: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const { agentId, prompt } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId || !prompt) {
        res.status(400).json({
          success: false,
          error: 'agentId and prompt are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const responseHandler = new ActionResponseHandler(tenantId, agentId, actionId);
      await responseHandler.updateActionPrompt(prompt, userId);

      res.status(200).json({
        success: true,
        message: 'Prompt updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error updating prompt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update prompt',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/actions/:actionId/publish
  publishAction: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const { agentId, sessionId } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId || !sessionId) {
        res.status(400).json({
          success: false,
          error: 'agentId and sessionId are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const chatManager = new ActionChatManager(tenantId, agentId, actionId);
      const responseHandler = new ActionResponseHandler(tenantId, agentId, actionId);
      
      // Get the session to retrieve the current understanding
      const session = await chatManager.getSession(sessionId);
      if (!session || !session.currentUnderstanding) {
        res.status(400).json({
          success: false,
          error: 'Session not found or no understanding available',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const understanding = session.currentUnderstanding;
      if (!understanding.proposedPrompt) {
        res.status(400).json({
          success: false,
          error: 'No prompt available to publish',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Update the main action document with the session's understanding
      await responseHandler.publishActionFromSession(understanding, userId);

      console.log(`🚀 Action published successfully: ${actionId}`);

      res.status(200).json({
        success: true,
        message: 'Action published successfully',
        data: {
          actionId,
          prompt: understanding.proposedPrompt,
          understanding: understanding.understanding
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error publishing action:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish action',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // PATCH /api/agent-training/actions/:actionId/status
  updateActionStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const { agentId, isActive, isDraft } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId || typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'agentId and isActive (boolean) are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const responseHandler = new ActionResponseHandler(tenantId, agentId, actionId);
      await responseHandler.updateActionStatus(isActive, isDraft, userId);

      console.log(`🔄 Action status updated: ${actionId} - ${isActive ? 'Active' : 'Inactive'}`);

      res.status(200).json({
        success: true,
        message: 'Action status updated successfully',
        data: {
          actionId,
          isActive,
          isDraft: isDraft || false
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error updating action status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update action status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // DELETE /api/agent-training/actions/:actionId
  deleteAction: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const { agentId } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'agentId is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const responseHandler = new ActionResponseHandler(tenantId, agentId, actionId);
      await responseHandler.deleteAction(userId);

      console.log(`🗑️ Action deleted successfully: ${actionId}`);

      res.status(200).json({
        success: true,
        message: 'Action deleted successfully',
        data: {
          actionId
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error deleting action:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete action',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
};