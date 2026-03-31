import { Request, Response } from 'express';
import { createCycle, updateCycle } from '../services/cycleManager';
import { runAgentBrain } from '../services/agentBrain';
import { runStandardCycleOrchestrator } from '../orchestrators/standardCycleOrchestrator';
import {
  createChat,
  readChat,
  deleteChat,
  listChats,
  createMessage,
  listMessages
} from '../services/chats';
import { addMessage2chat } from '../tools/addMessage2chat';
import {
  addLibraryImageToTemplate,
  removeImageFromTemplate,
  listTemplateImages
} from '../services/templateImages';

class TemplateAgentController {
  /**
   * POST /api/template-agent/start-cycle
   * Start an AI agent cycle to generate/improve an email template
   *
   * Body:
   * - tenantId: string (required)
   * - templateId: string (required)
   * - prompt?: string (optional - AI instructions)
   * - chatId?: string (optional - chat ID to associate with this cycle)
   */
  async startCycle(req: Request, res: Response): Promise<void> {
    console.log('\n========================================');
    console.log('[Template Agent Controller] START CYCLE REQUEST');
    console.log('========================================');

    try {
      const { tenantId, templateId, prompt, chatId } = req.body;

      console.log('[Template Agent Controller] Request body:', {
        tenantId,
        templateId,
        chatId,
        promptLength: prompt?.length || 0,
        prompt: prompt?.substring(0, 100) + '...'
      });

      // Validate required fields
      if (!tenantId || typeof tenantId !== 'string') {
        console.log('[Template Agent Controller] ❌ Validation failed: tenantId missing');
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!templateId || typeof templateId !== 'string') {
        console.log('[Template Agent Controller] ❌ Validation failed: templateId missing');
        res.status(400).json({ error: 'templateId is required' });
        return;
      }

      // Get userId from authenticated request (if available)
      const userId = (req as any).user?.uid;
      console.log('[Template Agent Controller] User ID:', userId || 'anonymous');

      // Create the agent cycle
      console.log('[Template Agent Controller] Creating cycle...');
      const cycle = await createCycle(tenantId, templateId, {
        prompt,
        createdBy: userId,
        chatId
      });
      console.log('[Template Agent Controller] ✓ Cycle created:', cycle.id);
      if (chatId) {
        console.log('[Template Agent Controller] ✓ Associated with chat:', chatId);
      }

      // Update cycle to show brain is thinking BEFORE returning response
      // This ensures frontend sees the activity when listener starts
      await updateCycle(tenantId, templateId, cycle.id, {
        currentActivity: 'brain_thinking',
        currentActivityLabel: 'Planning your template...'
      });
      console.log('[Template Agent Controller] ✓ Cycle activity set to brain_thinking');

      // Return cycle ID immediately - work continues in background
      console.log('[Template Agent Controller] ✓ Returning cycle ID to client immediately');
      res.status(200).json({
        success: true,
        message: 'Agent cycle started successfully',
        cycle: {
          id: cycle.id,
          tenantId: cycle.tenantId,
          templateId: cycle.templateId,
          status: cycle.status,
          createdAt: cycle.createdAt.toISOString(),
          updatedAt: cycle.updatedAt.toISOString(),
          prompt: cycle.prompt
        }
      });

      console.log('[Template Agent Controller] ✓ Response sent to client');
      console.log('[Template Agent Controller] Starting background processing...');
      console.log('========================================\n');

      // Run brain + orchestrator in background (don't await)
      // Frontend will get updates via real-time Firestore listeners
      (async () => {
        try {

          // Step 1: Call agent brain to think
          console.log('[Template Agent Controller] [Background] Step 1: Starting agent brain workflow...');
          const agentResult = await runAgentBrain({
            tenantId,
            templateId,
            cycleId: cycle.id
          });
          console.log('[Template Agent Controller] [Background] ✓ Agent brain workflow completed');
          console.log('[Template Agent Controller] [Background] Agent result:', {
            cycleId: agentResult.preparedData.cycleId,
            promptLength: agentResult.prompt.fullPrompt.length,
            initialResponse: agentResult.cyclePlan.parsedResponse.initialResponse.substring(0, 100) + '...',
            toolsCount: agentResult.cyclePlan.parsedResponse.tools.length,
            tools: agentResult.cyclePlan.parsedResponse.tools.map(t => t.tool)
          });

          // Step 2: Add brain's initial response to chat (BEFORE orchestrator runs)
          if (chatId) {
            console.log('[Template Agent Controller] [Background] Step 2: Adding brain response to chat...');
            try {
              const assistantMessage = await addMessage2chat({
                tenantId,
                templateId,
                cycleId: cycle.id,
                role: 'assistant',
                content: agentResult.cyclePlan.parsedResponse.initialResponse,
                metadata: {
                  tools: agentResult.cyclePlan.parsedResponse.tools
                }
              });
              console.log('[Template Agent Controller] [Background] ✓ Brain response added to chat:', assistantMessage.id);
            } catch (chatError) {
              console.error('[Template Agent Controller] [Background] ⚠️ Failed to add brain response to chat:', chatError);
              // Continue even if chat message fails - don't break the cycle
            }
          }

          // Step 3: Call orchestrator to create tasks
          console.log('[Template Agent Controller] [Background] Step 3: Running cycle orchestrator...');
          const orchestratorResult = await runStandardCycleOrchestrator({
            tenantId,
            templateId,
            cycleId: cycle.id,
            agentBrainResult: agentResult
          });
          console.log('[Template Agent Controller] [Background] ✓ Orchestrator completed');
          console.log('[Template Agent Controller] [Background] Orchestrator result:', {
            tasksCreated: orchestratorResult.tasksCreated,
            activeTaskId: orchestratorResult.activeTaskId,
            toolTypes: orchestratorResult.toolTypes
          });

          console.log('[Template Agent Controller] [Background] ✓ All background processing complete');
          console.log('========================================\n');
        } catch (backgroundError) {
          console.error('[Template Agent Controller] [Background] ❌ ERROR in background processing:', backgroundError);
          console.error('[Template Agent Controller] [Background] Error stack:', backgroundError instanceof Error ? backgroundError.stack : 'No stack trace');

          // Mark cycle as failed
          try {
            await updateCycle(tenantId, templateId, cycle.id, {
              status: 'failed',
              currentActivity: null,
              currentActivityLabel: null
            });
            console.log('[Template Agent Controller] [Background] ✓ Cycle marked as failed');
          } catch (updateError) {
            console.error('[Template Agent Controller] [Background] ❌ Failed to update cycle status:', updateError);
          }

          console.log('========================================\n');
        }
      })();

      // Response already sent above - request is complete
    } catch (error) {
      console.error('[Template Agent Controller] ❌ ERROR:', error);
      console.error('[Template Agent Controller] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('[Template Agent Controller] Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('[Template Agent Controller] Full error:', JSON.stringify(error, null, 2));
      console.log('========================================\n');

      res.status(500).json({
        error: 'Failed to start template agent cycle',
        details: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown'
      });
    }
  }

  /**
   * GET /api/template-agent/chats
   * List all chats for a template
   *
   * Query:
   * - tenantId: string (required)
   * - templateId: string (required)
   */
  async listChats(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, templateId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!templateId || typeof templateId !== 'string') {
        res.status(400).json({ error: 'templateId is required' });
        return;
      }

      const chats = await listChats(tenantId, templateId);

      res.status(200).json({
        success: true,
        chats
      });
    } catch (error) {
      console.error('Error listing chats:', error);
      res.status(500).json({
        error: 'Failed to list chats',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/template-agent/chats
   * Create a new chat
   *
   * Body:
   * - tenantId: string (required)
   * - templateId: string (required)
   * - name?: string (optional)
   */
  async createChat(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, templateId, name } = req.body;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!templateId || typeof templateId !== 'string') {
        res.status(400).json({ error: 'templateId is required' });
        return;
      }

      const userId = (req as any).user?.uid;

      const chat = await createChat({
        tenantId,
        templateId,
        name,
        createdBy: userId
      });

      res.status(201).json({
        success: true,
        chat
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      res.status(500).json({
        error: 'Failed to create chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/template-agent/chats/:chatId
   * Get a single chat by ID
   *
   * Query:
   * - tenantId: string (required)
   * - templateId: string (required)
   */
  async getChat(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const { tenantId, templateId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!templateId || typeof templateId !== 'string') {
        res.status(400).json({ error: 'templateId is required' });
        return;
      }

      const chat = await readChat(tenantId, templateId, chatId);

      if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
      }

      res.status(200).json({
        success: true,
        chat
      });
    } catch (error) {
      console.error('Error getting chat:', error);
      res.status(500).json({
        error: 'Failed to get chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/template-agent/chats/:chatId
   * Delete a chat
   *
   * Query:
   * - tenantId: string (required)
   * - templateId: string (required)
   */
  async deleteChat(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const { tenantId, templateId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!templateId || typeof templateId !== 'string') {
        res.status(400).json({ error: 'templateId is required' });
        return;
      }

      await deleteChat(tenantId, templateId, chatId);

      res.status(200).json({
        success: true,
        message: 'Chat deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
      res.status(500).json({
        error: 'Failed to delete chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/template-agent/chats/:chatId/messages
   * List all messages for a chat
   *
   * Query:
   * - tenantId: string (required)
   * - templateId: string (required)
   */
  async listMessages(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const { tenantId, templateId } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!templateId || typeof templateId !== 'string') {
        res.status(400).json({ error: 'templateId is required' });
        return;
      }

      const messages = await listMessages(tenantId, templateId, chatId);

      res.status(200).json({
        success: true,
        messages
      });
    } catch (error) {
      console.error('Error listing messages:', error);
      res.status(500).json({
        error: 'Failed to list messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/template-agent/chats/:chatId/messages
   * Add a message to a chat
   *
   * Body:
   * - tenantId: string (required)
   * - templateId: string (required)
   * - role: 'user' | 'assistant' (required)
   * - content: string (required)
   * - metadata?: object (optional)
   */
  async addMessage(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const { tenantId, templateId, role, content, metadata } = req.body;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!templateId || typeof templateId !== 'string') {
        res.status(400).json({ error: 'templateId is required' });
        return;
      }

      if (!role || !['user', 'assistant'].includes(role)) {
        res.status(400).json({ error: 'role must be "user" or "assistant"' });
        return;
      }

      if (!content || typeof content !== 'string') {
        res.status(400).json({ error: 'content is required' });
        return;
      }

      const message = await createMessage({
        tenantId,
        templateId,
        chatId,
        role,
        content,
        metadata
      });

      res.status(201).json({
        success: true,
        message
      });
    } catch (error) {
      console.error('Error adding message:', error);
      res.status(500).json({
        error: 'Failed to add message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/template-agent/templates/:templateId/images
   * List all images for a template
   */
  async listTemplateImages(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { tenantId } = req.query;

      console.log('[Template Agent Controller] Listing template images');
      console.log('[Template Agent Controller] Template ID:', templateId);
      console.log('[Template Agent Controller] Tenant ID:', tenantId);

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!templateId || typeof templateId !== 'string') {
        res.status(400).json({ error: 'templateId is required' });
        return;
      }

      const result = await listTemplateImages(tenantId, templateId);

      res.status(200).json({
        success: true,
        images: result.images,
        totalImages: result.totalImages
      });
    } catch (error) {
      console.error('Error listing template images:', error);
      res.status(500).json({
        error: 'Failed to list template images',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/template-agent/templates/:templateId/images
   * Add a library image to template
   */
  async addImageToTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { tenantId, libraryImageId } = req.body;

      console.log('[Template Agent Controller] Adding library image to template');
      console.log('[Template Agent Controller] Template ID:', templateId);
      console.log('[Template Agent Controller] Tenant ID:', tenantId);
      console.log('[Template Agent Controller] Library Image ID:', libraryImageId);

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!templateId || typeof templateId !== 'string') {
        res.status(400).json({ error: 'templateId is required' });
        return;
      }

      if (!libraryImageId || typeof libraryImageId !== 'string') {
        res.status(400).json({ error: 'libraryImageId is required' });
        return;
      }

      const result = await addLibraryImageToTemplate({
        tenantId,
        templateId,
        libraryImageId
      });

      res.status(201).json({
        success: true,
        templateImage: {
          id: result.imageId,
          url: result.url,
          storagePath: result.storagePath,
          purpose: result.purpose,
          dimensions: result.dimensions,
          style: result.style,
          createdAt: new Date().toISOString(),
          addedFrom: 'library',
          librarySource: true
        }
      });
    } catch (error) {
      console.error('Error adding image to template:', error);
      res.status(500).json({
        error: 'Failed to add image to template',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/template-agent/templates/:templateId/images/:imageId
   * Remove an image from template
   */
  async removeImageFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId, imageId } = req.params;
      const { tenantId } = req.query;

      console.log('[Template Agent Controller] Removing image from template');
      console.log('[Template Agent Controller] Template ID:', templateId);
      console.log('[Template Agent Controller] Tenant ID:', tenantId);
      console.log('[Template Agent Controller] Image ID:', imageId);

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (!templateId || typeof templateId !== 'string') {
        res.status(400).json({ error: 'templateId is required' });
        return;
      }

      if (!imageId || typeof imageId !== 'string') {
        res.status(400).json({ error: 'imageId is required' });
        return;
      }

      const result = await removeImageFromTemplate({
        tenantId,
        templateId,
        imageId
      });

      res.status(200).json({
        success: true,
        imageId: result.imageId
      });
    } catch (error) {
      console.error('Error removing image from template:', error);
      res.status(500).json({
        error: 'Failed to remove image from template',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const templateAgentController = new TemplateAgentController();
