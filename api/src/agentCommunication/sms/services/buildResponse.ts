import { firestore } from '../../../config/firebase';
import { generateMessage } from './buildSms/generateMessage';
import { generateCaseNumberService } from './generateCaseNumber';
import { AnalysisData, MessageContext, AgentConfig } from './buildSms/components/buildPrompt';
import { actionPromptService, ActionData } from './actionPromptService';

/**
 * Main service for building SMS responses
 * Orchestrates the complete SMS generation process using case data
 */

export interface BuildResponseRequest {
  tenantId: string;
  agentId: string;
  caseId: string;
  isTraining?: boolean;
  trainingSessionId?: string;
  actionId?: string; // NEW: Optional action ID for contextual responses
  options?: {
    maxTokens?: number;
    temperature?: number;
    enableRetry?: boolean;
    maxRetries?: number;
  };
}

export interface BuildResponseResult {
  success: boolean;
  message?: string;
  caseId: string;
  caseNumber?: string;
  metadata?: {
    promptLength: number;
    messageLength: number;
    smsPartCount: number;
    validationWarnings: string[];
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
    processingTime: number;
  };
  error?: string;
}

export class BuildResponseService {
  /**
   * Build SMS response using case data from analysis
   */
  async buildSmsResponse(request: BuildResponseRequest): Promise<BuildResponseResult> {
    try {
      console.log(`= Starting SMS response building for case ${request.caseId}`);
      if (request.actionId) {
        console.log(`🎯 Action context requested: ${request.actionId}`);
      }

      // Step 0: Load action data if actionId provided
      let actionData: ActionData | null = null;
      if (request.actionId) {
        console.log('= Step 0: Loading action context...');
        actionData = await actionPromptService.getActionData({
          actionId: request.actionId,
          tenantId: request.tenantId,
          agentId: request.agentId
        });

        if (actionData) {
          console.log(`✅ Action context loaded: ${actionData.name} (${actionData.type})`);
          console.log(`📋 Action guidance: ${actionPromptService.getActionGuidance(actionData)}`);
        } else {
          console.warn(`⚠️ Action ${request.actionId} not found or inactive, proceeding without action context`);
        }
      }

      // Step 1: Load case data with analysis results
      console.log('= Step 1: Loading case data...');
      const caseData = await generateCaseNumberService.getCase(
        request.tenantId,
        request.agentId,
        request.caseId
      );

      if (!caseData) {
        return {
          success: false,
          caseId: request.caseId,
          error: 'Case not found'
        };
      }

      console.log(`= Case loaded: ${caseData.caseNumber || request.caseId}`);

      // Step 2: Load agent configuration (training mode aware)
      console.log('= Step 2: Loading agent configuration...');
      const agentConfig = await this.loadAgentConfiguration(
        request.tenantId, 
        request.agentId,
        request.isTraining,
        request.trainingSessionId
      );

      if (!agentConfig) {
        return {
          success: false,
          caseId: request.caseId,
          error: 'Agent configuration not found'
        };
      }

      // Step 3: Prepare data for message generation
      console.log('= Step 3: Preparing message generation data...');
      
      const analysisData: AnalysisData = {
        analysis: caseData.analysis || 'No analysis available',
        ragNeeded: caseData.ragNeeded || false,
        ragAnalysis: caseData.ragAnalysis,
        documentContexts: caseData.documentContexts || [],
        kbDocumentIds: caseData.kbDocumentIds || []
      };

      const messageContext: MessageContext = {
        userMessage: caseData.initialMessageContent || 'No message content',
        from: caseData.from,
        to: caseData.to,
        messageId: caseData.initialMessageId,
        conversationId: caseData.conversationId,
        conversationHistory: caseData.conversationHistory, // Conversation context
        contactProfile: caseData.contactProfile, // NEW: AI-learned contact profile
        promptContext: caseData.promptContext // NEW: Pre-formatted prompt sections
      };

      // Step 4: Detect if this is an outbound message (based on analysis content)
      const isOutbound = analysisData.analysis.includes('Outbound message initiated');
      
      if (isOutbound) {
        console.log('🎯 Detected outbound message - using outbound prompt context');
      }

      // Step 4: Generate the SMS message with action context
      console.log('= Step 4: Generating SMS message...');
      const messageResult = await generateMessage.generateMessage({
        analysisData,
        messageContext,
        agentConfig,
        tenantId: request.tenantId, // NEW: Required for baseline document loading
        caseId: request.caseId,
        actionData, // NEW: Pass action context to message generation
        isOutbound, // NEW: Pass outbound flag to message generation
        options: request.options
      });

      if (!messageResult.success) {
        // Update case status to failed
        await generateCaseNumberService.updateCaseStatus(
          request.tenantId,
          request.agentId,
          request.caseId,
          'failed',
          'response_generation',
          'analysis'
        );

        return {
          success: false,
          caseId: request.caseId,
          caseNumber: caseData.caseNumber,
          error: messageResult.error
        };
      }

      // Step 5: Save the generated response to the case
      console.log('= Step 5: Saving response to case...');
      await generateCaseNumberService.updateCaseAnalysis(
        request.tenantId,
        request.agentId,
        request.caseId,
        {
          response: messageResult.message
        }
      );

      // Update case status to completed
      await generateCaseNumberService.updateCaseStatus(
        request.tenantId,
        request.agentId,
        request.caseId,
        'completed',
        'response_ready',
        'response_generation'
      );

      console.log('= SMS response building completed successfully');
      console.log(`= Generated response: "${messageResult.message}"`);

      return {
        success: true,
        message: messageResult.message,
        caseId: request.caseId,
        caseNumber: caseData.caseNumber,
        metadata: messageResult.metadata
      };

    } catch (error) {
      console.error('Error building SMS response:', error);

      // Update case status to failed
      try {
        await generateCaseNumberService.updateCaseStatus(
          request.tenantId,
          request.agentId,
          request.caseId,
          'failed',
          'error',
          undefined
        );
      } catch (updateError) {
        console.error('Failed to update case status to failed:', updateError);
      }

      return {
        success: false,
        caseId: request.caseId,
        error: `Response building failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Load agent configuration from Firestore (training mode aware)
   */
  private async loadAgentConfiguration(
    tenantId: string, 
    agentId: string,
    isTraining?: boolean,
    trainingSessionId?: string
  ): Promise<AgentConfig | null> {
    try {
      // In training mode, try to get test agent configuration first
      if (isTraining && trainingSessionId) {
        console.log(`🧪 Training mode: Attempting to load test agent config for session ${trainingSessionId}`);
        
        try {
          const testAgentRef = firestore
            .collection('tenants').doc(tenantId)
            .collection('trainingSessions').doc(trainingSessionId)
            .collection('testAgent').doc(agentId);

          const testAgentSnapshot = await testAgentRef.get();

          if (testAgentSnapshot.exists) {
            const testData = testAgentSnapshot.data();
            console.log('✅ Using test agent configuration from training session');
            console.log('🔍 Debug - Test agent buildResponse data:', {
              hasName: !!testData?.name,
              hasPrompt: !!testData?.prompt,
              hasSystemPrompt: !!testData?.systemPrompt,
              hasLlmSettings: !!testData?.llmSettings,
              hasLlmPrompt: !!testData?.llmSettings?.prompt,
              finalPrompt: testData?.llmSettings?.prompt || testData?.prompt || testData?.systemPrompt || 'FALLBACK'
            });
            
            return {
              name: testData?.name || testData?.agentName || 'Test Customer Service Agent',
              prompt: testData?.llmSettings?.prompt || testData?.prompt || testData?.systemPrompt || 'You are a helpful customer service agent.',
              businessContext: testData?.businessContext || testData?.description,
              specialInstructions: testData?.specialInstructions
            };
          } else {
            console.log('⚠️ Test agent not found, falling back to live agent configuration');
          }
        } catch (error) {
          console.warn('⚠️ Error loading test agent, falling back to live agent:', error);
        }
      }

      // Default/fallback: Get live agent configuration
      console.log(isTraining ? '🔄 Using live agent configuration as fallback' : '🔴 Production mode: Using live agent configuration');
      
      const agentRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId);

      const agentSnapshot = await agentRef.get();

      if (!agentSnapshot.exists) {
        return null;
      }

      const data = agentSnapshot.data();
      
      return {
        name: data?.name || 'Customer Service Agent',
        prompt: data?.llmSettings?.prompt || data?.prompt || 'You are a helpful customer service agent.',
        businessContext: data?.businessContext || data?.description,
        specialInstructions: data?.specialInstructions
      };

    } catch (error) {
      console.error('Error loading agent configuration:', error);
      return null;
    }
  }

  /**
   * Build a simple response without case data (fallback method)
   */
  async buildSimpleResponse(
    tenantId: string,
    agentId: string,
    userMessage: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      isTraining?: boolean;
      trainingSessionId?: string;
      actionId?: string; // NEW: Optional action context for simple responses
    }
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    metadata?: any;
  }> {
    try {
      console.log('= Building simple SMS response (fallback mode)');

      // Load action data if actionId provided
      let actionData: ActionData | null = null;
      if (options?.actionId) {
        console.log(`🎯 Loading action context for simple response: ${options.actionId}`);
        actionData = await actionPromptService.getActionData({
          actionId: options.actionId,
          tenantId: tenantId,
          agentId: agentId
        });

        if (actionData) {
          console.log(`✅ Simple response action context loaded: ${actionData.name} (${actionData.type})`);
        }
      }

      // Load agent configuration (training mode aware)
      const agentConfig = await this.loadAgentConfiguration(
        tenantId, 
        agentId, 
        options?.isTraining, 
        options?.trainingSessionId
      );

      if (!agentConfig) {
        return {
          success: false,
          error: 'Agent configuration not found'
        };
      }

      // Generate simple message with action context
      const messageResult = await generateMessage.generateSimpleMessage(
        userMessage,
        agentConfig,
        actionData, // NEW: Pass action context to simple message generation
        options
      );

      if (!messageResult.success) {
        return {
          success: false,
          error: messageResult.error
        };
      }

      console.log('= Simple response building completed');
      
      return {
        success: true,
        message: messageResult.message,
        metadata: messageResult.metadata
      };

    } catch (error) {
      console.error('Error building simple response:', error);
      
      return {
        success: false,
        error: `Simple response building failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const buildResponseService = new BuildResponseService();