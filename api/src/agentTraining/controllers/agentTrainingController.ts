import { Request, Response } from 'express';
import { startAgentTraining } from '../services/startAgentTraining';
import { analysisCycleService } from '../services/analysisCycle';
import { getPreviousSessions } from '../services/getPreviousSessions';
import { applySuggestionsService } from '../services/applySuggestions/applySuggestions';
import { clearSessionChatService } from '../services/clearSessionChat';
import { createTestAgentService } from '../services/startAgentTraining/createTestAgent';
import { getTrainingConfigs, updateTrainingConfigs, publishTrainingConfigs } from '../services/publishTrainingConfigs';

export const agentTrainingController = {
  // POST /api/agent-training/start
  startTrainingSession: async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentId, mode } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      // Validate required fields
      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'Agent ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate mode
      if (mode && !['chat', 'call'].includes(mode)) {
        res.status(400).json({
          success: false,
          error: 'Invalid training mode. Must be "chat" or "call"',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Start training session
      const sessionResult = await startAgentTraining({
        agentId,
        tenantId,
        userId,
        mode: mode || 'chat'
      });

      res.status(201).json({
        success: true,
        data: sessionResult,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error starting training session:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to start training session',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // GET /api/agent-training/session/:sessionId
  getTrainingSession: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // TODO: Implement get session logic
      res.status(200).json({
        success: true,
        data: { sessionId, status: 'active' },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error getting training session:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get training session',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // PUT /api/agent-training/session/:sessionId/end
  endTrainingSession: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // TODO: Implement end session logic
      res.status(200).json({
        success: true,
        data: { sessionId, status: 'ended' },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error ending training session:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to end training session',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/session/:sessionId/message
  addMessage: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { message, sender, mode } = req.body;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!message || !sender) {
        res.status(400).json({
          success: false,
          error: 'Message and sender are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // TODO: Implement add message logic
      res.status(201).json({
        success: true,
        data: { 
          sessionId, 
          messageId: `msg_${Date.now()}`,
          message,
          sender,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error adding message to session:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to add message to session',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/session/:sessionId/analysis-cycle
  startAnalysisCycle: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { agentId, triggeredBy, messageCount } = req.body;
      
      // Handle internal service calls
      const isInternalService = req.headers['x-internal-service'] === 'sms-agent-controller';
      const tenantId = req.tenantId || req.headers['x-tenant-id'] as string;

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
          error: 'Agent ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🔄 Starting analysis cycle for session: ${sessionId}, agent: ${agentId}`);
      console.log(`  - Triggered by: ${triggeredBy || 'manual'}`);
      console.log(`  - Message count: ${messageCount || 'unknown'}`);
      console.log(`  - Internal service: ${isInternalService ? 'Yes' : 'No'}`);

      // Run the analysis cycle
      const analysisResult = await analysisCycleService.runAnalysisCycle({
        sessionId,
        tenantId,
        agentId
      });

      if (!analysisResult.success) {
        res.status(500).json({
          success: false,
          error: 'Analysis cycle failed',
          details: analysisResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          cycleId: analysisResult.cycleId,
          cycleNumber: analysisResult.cycleNumber,
          analysis: analysisResult.analysis,
          suggestions: analysisResult.suggestions,
          status: 'completed'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error running analysis cycle:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to run analysis cycle',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // GET /api/agent-training/sessions/:agentId
  getPreviousSessions: async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentId } = req.params;
      const { limit } = req.query;
      const tenantId = req.tenantId;

      console.log('getPreviousSessions request:', {
        agentId,
        tenantId,
        limit,
        user: req.user
      });

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
          error: 'Agent ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get previous sessions
      const sessionsResult = await getPreviousSessions({
        agentId,
        tenantId,
        limit: limit ? parseInt(limit as string, 10) : undefined
      });

      if (!sessionsResult.success) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch previous sessions',
          details: sessionsResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          sessions: sessionsResult.sessions || [],
          total: sessionsResult.sessions?.length || 0
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error fetching previous sessions:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch previous sessions',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/training/sessions/:sessionId/agents/:agentId/apply-suggestions
  applyCycleSuggestions: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, agentId } = req.params;
      const tenantId = req.tenantId || req.user?.tenantId;
      const { cycleId, selectedSuggestions } = req.body;

      console.log('🎯 Apply Cycle Suggestions Controller');
      console.log(`  - Session ID: ${sessionId}`);
      console.log(`  - Agent ID: ${agentId}`);
      console.log(`  - Cycle ID: ${cycleId}`);
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Selection mode: ${selectedSuggestions ? 'Selective' : 'Apply All'}`);

      // Validate required parameters
      if (!sessionId || !agentId || !cycleId || !tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          details: {
            sessionId: !!sessionId,
            agentId: !!agentId,
            cycleId: !!cycleId,
            tenantId: !!tenantId
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Apply suggestions to test agent
      const result = await applySuggestionsService.applySuggestions({
        tenantId,
        sessionId,
        agentId,
        cycleId,
        selectedSuggestions
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: 'Failed to apply suggestions',
          details: result.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('✅ Suggestions applied successfully');
      
      res.status(200).json({
        success: true,
        message: 'Suggestions applied successfully to test agent configuration',
        data: {
          appliedChanges: result.appliedChanges,
          cycleInfo: result.cycleInfo,
          changeLog: result.changeLog,
          updatedConfig: result.updatedConfig
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Error applying cycle suggestions:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to apply cycle suggestions',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // GET /api/training/sessions/:sessionId/cycles/:cycleId/preview
  previewCycleSuggestions: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, cycleId } = req.params;
      const tenantId = req.tenantId || req.user?.tenantId;
      const { agentId } = req.query;

      console.log('👁️ Preview Cycle Suggestions Controller');
      console.log(`  - Session ID: ${sessionId}`);
      console.log(`  - Cycle ID: ${cycleId}`);
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Agent ID: ${agentId}`);

      // Validate required parameters
      if (!sessionId || !cycleId || !tenantId || !agentId) {
        res.status(400).json({
          success: false,
          error: 'Missing required query parameters',
          details: {
            sessionId: !!sessionId,
            cycleId: !!cycleId,
            tenantId: !!tenantId,
            agentId: !!agentId
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get preview of suggestions
      const result = await applySuggestionsService.previewSuggestions({
        tenantId: tenantId as string,
        sessionId,
        agentId: agentId as string,
        cycleId
      });

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: 'Failed to preview suggestions',
          details: result.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('✅ Suggestions preview generated successfully');
      
      res.status(200).json({
        success: true,
        data: result.preview,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Error previewing cycle suggestions:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to preview cycle suggestions',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/sessions/:sessionId/clear-chat
  clearSessionChat: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { clearAnalysis } = req.body;
      const tenantId = req.tenantId;

      // Validate required fields
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🧹 Clearing chat for training session: ${sessionId}`);
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Clear analysis cycles: ${clearAnalysis ? 'Yes' : 'No'}`);

      // Clear chat messages
      const clearResult = await clearSessionChatService.clearSessionChat({
        tenantId,
        sessionId
      });

      if (!clearResult.success) {
        res.status(500).json({
          success: false,
          error: 'Failed to clear chat messages',
          details: clearResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      let cyclesCleared = 0;
      
      // Optionally clear analysis cycles if requested
      if (clearAnalysis) {
        const cyclesClearResult = await clearSessionChatService.clearAnalysisCycles({
          tenantId,
          sessionId
        });
        
        if (cyclesClearResult.success) {
          cyclesCleared = cyclesClearResult.messagesCleared;
        } else {
          console.warn('⚠️ Failed to clear analysis cycles:', cyclesClearResult.error);
        }
      }

      // Reset session metadata
      const metadataReset = await clearSessionChatService.resetSessionMetadata({
        tenantId,
        sessionId
      });

      console.log(`✅ Chat cleared successfully:`);
      console.log(`  - Messages cleared: ${clearResult.messagesCleared}`);
      console.log(`  - Analysis cycles cleared: ${cyclesCleared}`);
      console.log(`  - Metadata reset: ${metadataReset ? 'Yes' : 'No'}`);

      res.status(200).json({
        success: true,
        data: {
          messagesCleared: clearResult.messagesCleared,
          cyclesCleared,
          metadataReset,
          sessionId,
          clearedAt: new Date().toISOString()
        },
        message: `Successfully cleared ${clearResult.messagesCleared} messages`,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Error clearing session chat:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to clear session chat',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // GET /api/agent-training/sessions/:sessionId/test-agent-config/:agentId
  getTestAgentConfig: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, agentId } = req.params;
      const tenantId = req.tenantId;

      // Validate required fields
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!sessionId || !agentId) {
        res.status(400).json({
          success: false,
          error: 'Session ID and Agent ID are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`📖 Getting test agent config: ${sessionId}/${agentId}`);

      // Get test agent configuration
      const configResult = await createTestAgentService.getTestAgentConfig(
        tenantId,
        sessionId,
        agentId
      );

      if (!configResult.success) {
        res.status(404).json({
          success: false,
          error: 'Test agent configuration not found',
          details: configResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`✅ Retrieved test agent config version ${configResult.testAgentConfig?.configVersion}`);

      res.status(200).json({
        success: true,
        data: configResult.testAgentConfig,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Error getting test agent config:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get test agent configuration',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // PUT /api/agent-training/sessions/:sessionId/test-agent-config/:agentId
  updateTestAgentConfig: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, agentId } = req.params;
      const { configChanges, reason } = req.body;
      const tenantId = req.tenantId;

      console.log('🔧 Update Test Agent Config Controller');
      console.log(`  - Session ID: ${sessionId}`);
      console.log(`  - Agent ID: ${agentId}`);
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Reason: ${reason || 'Manual configuration update'}`);
      console.log(`  - Changes: ${Object.keys(configChanges || {}).join(', ')}`);

      // Validate required fields
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!sessionId || !agentId) {
        res.status(400).json({
          success: false,
          error: 'Session ID and Agent ID are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!configChanges || typeof configChanges !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Configuration changes are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Update test agent configuration
      const updateResult = await createTestAgentService.updateTestAgentConfig(
        tenantId,
        sessionId,
        agentId,
        configChanges,
        reason || 'Manual configuration update via training interface'
      );

      if (!updateResult.success) {
        res.status(400).json({
          success: false,
          error: 'Failed to update test agent configuration',
          details: updateResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`✅ Test agent config updated to version ${updateResult.testAgentConfig?.configVersion}`);

      res.status(200).json({
        success: true,
        message: 'Test agent configuration updated successfully',
        data: updateResult.testAgentConfig,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Error updating test agent config:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update test agent configuration',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/publish-configs/get
  getPublishConfigs: async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, sessionId, agentId } = req.body;
      const requestTenantId = req.tenantId;

      // Validate required fields
      if (!tenantId || !sessionId || !agentId) {
        res.status(400).json({
          success: false,
          error: 'tenantId, sessionId, and agentId are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Ensure tenant matches authenticated user
      if (tenantId !== requestTenantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this tenant',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`📖 Getting publish configs for session: ${sessionId}, agent: ${agentId}`);

      const result = await getTrainingConfigs({
        tenantId,
        sessionId,
        agentId
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          config: result.config,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error || 'Training configuration not found',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error getting publish configs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get training configuration',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/publish-configs/update
  updatePublishConfigs: async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, sessionId, agentId, configChanges } = req.body;
      const requestTenantId = req.tenantId;

      // Validate required fields
      if (!tenantId || !sessionId || !agentId || !configChanges) {
        res.status(400).json({
          success: false,
          error: 'tenantId, sessionId, agentId, and configChanges are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Ensure tenant matches authenticated user
      if (tenantId !== requestTenantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this tenant',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🔄 Updating publish configs for session: ${sessionId}, agent: ${agentId}`);

      const result = await updateTrainingConfigs({
        tenantId,
        sessionId,
        agentId,
        configChanges
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          config: result.config,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to update training configuration',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error updating publish configs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update training configuration',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/publish-configs/publish
  publishTrainingConfigs: async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, sessionId, agentId, finalConfig } = req.body;
      const requestTenantId = req.tenantId;

      // Validate required fields
      if (!tenantId || !sessionId || !agentId) {
        res.status(400).json({
          success: false,
          error: 'tenantId, sessionId, and agentId are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Ensure tenant matches authenticated user
      if (tenantId !== requestTenantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this tenant',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🚀 Publishing training configs for session: ${sessionId}, agent: ${agentId}`);

      const result = await publishTrainingConfigs({
        tenantId,
        sessionId,
        agentId,
        finalConfig
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          publishedConfig: result.publishedConfig,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to publish training configuration',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error publishing training configs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish training configuration',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};