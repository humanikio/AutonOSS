import { firestore } from '../../../../config/firebase';
import { InitialAnalysis } from '../analyzeSms';
import { claude4 } from '../../../../llmModels/claude4';
import { generateCaseNumberService } from '../generateCaseNumber';
import { ChatHistoryResult } from '../../utilities/getChatHistory';
import { JsonValidator } from '../../utilities/jsonValidator';
import { actionPromptService, ActionData } from '../actionPromptService';

interface AgentPromptAnalysisRequest {
  messageContent: string;
  agentId: string;
  tenantId: string;
  caseId?: string;
  conversationHistory?: ChatHistoryResult['conversationHistory'];
  isTraining?: boolean;
  trainingSessionId?: string;
  actionId?: string; // NEW: Optional action ID for context
}

interface AgentData {
  name: string;
  prompt?: string;
  knowledgeBaseIndex?: Array<{
    documentId: string;
    title: string;
    type: string;
    summary?: string;
    keyPoints?: string[];
    tags?: string[];
    elevenLabsDocId: string;
  }>;
}

export class AgentPromptAnalysis {
  /**
   * Analyze user message against agent prompt and determine if RAG is needed
   */
  async analyze(request: AgentPromptAnalysisRequest): Promise<InitialAnalysis> {
    try {
      // Fetch agent data from Firestore (training mode aware)
      const agentData = await this.getAgentData(
        request.tenantId, 
        request.agentId, 
        request.isTraining, 
        request.trainingSessionId
      );
      
      if (!agentData.prompt) {
        throw new Error('Agent does not have a configured prompt');
      }

      // NEW: Fetch action data if actionId provided
      let actionData: ActionData | null = null;
      if (request.actionId) {
        console.log(`🎯 Fetching action data for analysis: ${request.actionId}`);
        actionData = await actionPromptService.getActionData({
          actionId: request.actionId,
          tenantId: request.tenantId,
          agentId: request.agentId
        });

        if (actionData) {
          console.log(`✅ Action data loaded for analysis: ${actionData.name} (${actionData.type})`);
        } else {
          console.warn(`⚠️ Action ${request.actionId} not found or inactive, proceeding without action context`);
        }
      }

      // Build KB index from agent's knowledge base index
      const kbIndex = this.buildKbIndex(agentData.knowledgeBaseIndex || []);

      // Create system prompt for analysis (enhanced with action awareness)
      const systemPrompt = this.buildSystemPrompt(actionData);

      // Create user prompt with agent details, KB index, conversation context, and action context
      const userPrompt = this.buildUserPrompt(
        agentData.prompt,
        request.messageContent,
        kbIndex,
        request.conversationHistory,
        actionData
      );

      // Call Claude for analysis
      const fullPrompt = `${systemPrompt}

${userPrompt}

Please respond with valid JSON only, no other text.`;

      const response = await claude4.processText(fullPrompt);
      
      if (!response) {
        throw new Error('No response from Claude');
      }

      // Parse the response using robust JSON validator
      const validationResult = JsonValidator.validateAndParse(
        response, 
        'Agent Prompt Analysis'
      );

      let analysisResult: InitialAnalysis;

      if (!validationResult.success) {
        console.error('❌ JSON validation failed:', validationResult.error);
        console.log('📄 Using fallback analysis data');
        
        // Use fallback data when JSON parsing completely fails
        const fallbackData = JsonValidator.createAgentPromptAnalysisFallback(response);
        analysisResult = fallbackData as InitialAnalysis;
        
        console.log('🔄 Proceeding with fallback analysis:', analysisResult);
      } else {
        analysisResult = validationResult.data as InitialAnalysis;
        
        // Additional schema validation for agent prompt analysis
        const schemaValidation = JsonValidator.validateAgentPromptAnalysis(analysisResult);
        if (!schemaValidation.success) {
          console.warn('⚠️ Schema validation failed:', schemaValidation.error);
          console.log('📄 Using fallback analysis data');
          analysisResult = JsonValidator.createAgentPromptAnalysisFallback(response) as InitialAnalysis;
        }
        
        if (validationResult.repaired) {
          console.log('🔧 JSON was successfully repaired before parsing');
        }
      }

      console.log('=� Agent Prompt Analysis Complete:', {
        ragNeeded: analysisResult.ragNeeded,
        documentCount: analysisResult.kbDocumentIds?.length || 0
      });

      // Save agent prompt analysis to case if caseId is provided
      if (request.caseId) {
        await generateCaseNumberService.updateCaseAnalysis(
          request.tenantId,
          request.agentId,
          request.caseId,
          {
            agentPromptAnalysis: analysisResult.analysis
          }
        );
        
        console.log(`= Agent prompt analysis saved to case ${request.caseId}`);
      }

      return analysisResult;

    } catch (error) {
      console.error('Error in agent prompt analysis:', error);
      throw new Error(`Agent prompt analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch agent data from Firestore (training mode aware)
   */
  private async getAgentData(
    tenantId: string, 
    agentId: string,
    isTraining?: boolean,
    trainingSessionId?: string
  ): Promise<AgentData> {
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
          console.log('🔍 Debug - Test agent data structure:', {
            hasName: !!testData?.name,
            hasPrompt: !!testData?.prompt,
            hasSystemPrompt: !!testData?.systemPrompt,
            hasLlmSettings: !!testData?.llmSettings,
            hasLlmPrompt: !!testData?.llmSettings?.prompt,
            promptPath1: testData?.llmSettings?.prompt ? 'Found in llmSettings.prompt' : 'Not in llmSettings.prompt',
            promptPath2: testData?.prompt ? 'Found in prompt' : 'Not in prompt',
            promptPath3: testData?.systemPrompt ? 'Found in systemPrompt' : 'Not in systemPrompt',
            actualPrompt: testData?.llmSettings?.prompt || testData?.prompt || testData?.systemPrompt || 'NO PROMPT FOUND',
            hasKnowledgeBaseIndex: !!testData?.knowledgeBaseIndex,
            hasKnowledgeBase: !!testData?.knowledgeBase,
            kbIndexType: testData?.knowledgeBaseIndex ? typeof testData.knowledgeBaseIndex : 'not found',
            kbType: testData?.knowledgeBase ? typeof testData.knowledgeBase : 'not found',
            kbIndexIsArray: Array.isArray(testData?.knowledgeBaseIndex),
            kbIsArray: Array.isArray(testData?.knowledgeBase)
          });
          
          const extractedPrompt = testData?.systemPrompt || testData?.llmSettings?.prompt || testData?.prompt;
          
          return {
            name: testData?.name || testData?.agentName || 'Test Agent',
            prompt: extractedPrompt,
            knowledgeBaseIndex: testData?.knowledgeBaseIndex || testData?.knowledgeBase || []
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
      throw new Error(`Agent ${agentId} not found`);
    }

    const data = agentSnapshot.data();
    return {
      name: data?.name || 'Unnamed Agent',
      prompt: data?.prompt || data?.llmSettings?.prompt || data?.conversation?.agent?.prompt?.prompt,
      knowledgeBaseIndex: data?.knowledgeBaseIndex || []
    };
  }

  /**
   * Build KB index from agent's knowledge base index
   */
  private buildKbIndex(kbIndex: AgentData['knowledgeBaseIndex']): string {
    if (!kbIndex) {
      return 'No knowledge base documents available.';
    }

    // Handle different knowledge base formats
    let kbArray: any[] = [];
    if (Array.isArray(kbIndex)) {
      kbArray = kbIndex;
    } else if (typeof kbIndex === 'object' && kbIndex !== null) {
      // If it's an object, try to extract array values or convert to array
      const kbObj = kbIndex as any;
      if ('knowledgeBase' in kbObj && Array.isArray(kbObj.knowledgeBase)) {
        kbArray = kbObj.knowledgeBase;
      } else {
        // Convert object to array of entries
        kbArray = Object.values(kbObj).filter(item => item && typeof item === 'object');
      }
    }

    if (kbArray.length === 0) {
      return 'No knowledge base documents available.';
    }

    const indexLines = kbArray.map((doc, index) => {
      // Use only internal document ID (never 11Labs ID)
      const docId = doc.documentId || doc.id || `doc_${index}`;
      const docTitle = doc.title || doc.name || 'Untitled Document';
      const docType = doc.type || 'document';
      
      let docInfo = `${index + 1}. [ID: ${docId}] "${docTitle}" - Type: ${docType}`;
      
      if (doc.summary) {
        docInfo += `\n   Summary: ${doc.summary}`;
      }
      
      if (doc.keyPoints && doc.keyPoints.length > 0) {
        const keyPointsPreview = doc.keyPoints.slice(0, 3).join(', ');
        docInfo += `\n   Key Points: ${keyPointsPreview}${doc.keyPoints.length > 3 ? '...' : ''}`;
      }
      
      if (doc.tags && doc.tags.length > 0) {
        docInfo += `\n   Tags: ${doc.tags.join(', ')}`;
      }
      
      return docInfo;
    });

    return `Available Knowledge Base Documents:\n${indexLines.join('\n\n')}`;
  }

  /**
   * Build system prompt for the analysis (enhanced with action awareness)
   */
  private buildSystemPrompt(actionData?: ActionData | null): string {
    let systemPrompt = `You are an AI assistant that serves as the "thinking brain" for a customer service agent. Your task is to analyze incoming messages and provide strategic thinking about how to respond.

Your role:
1. Analyze the user's message in context of the ongoing conversation
2. Consider the agent's role, capabilities, and communication style
3. Determine if knowledge base documents would improve the response
4. Provide tactical guidance for crafting an appropriate response`;

    // Add action-specific analysis guidance
    if (actionData) {
      systemPrompt += `
5. IMPORTANT: Consider the specific action context - this interaction is part of "${actionData.name}" (${actionData.type})
6. Factor in the action's specialized guidance when analyzing response strategy`;
    }

    systemPrompt += `

Your response must be a valid JSON object with the following structure:
{
  "analysis": "Strategic thinking about how to approach this response - consider user intent, conversation flow, appropriate tone, and response strategy`;

    if (actionData) {
      systemPrompt += `. CRITICAL: Factor in that this is a ${actionData.type} action for '${actionData.name}' when crafting your analysis`;
    }

    systemPrompt += `",
  "ragNeeded": true or false,
  "kbDocumentIds": ["documentId1", "documentId2"] // Only include if ragNeeded is true
}

Guidelines:
- Focus your analysis on user intent and response strategy, not technical details`;

    if (actionData) {
      systemPrompt += `
- CONTEXTUAL PRIORITY: This interaction has specific action context (${actionData.type}: ${actionData.name})
- Consider how this action context should influence the response approach and knowledge needs`;
    }

    systemPrompt += `
- Set ragNeeded to true if ANY of these conditions apply:
  * User asks about products, services, or specific information
  * Agent's role involves explaining products/services but their prompt lacks specific details
  * Agent mentions products/services but appears to need more concrete information
  * User's message could benefit from factual, documented information rather than generic responses`;

    if (actionData && actionPromptService.shouldInfluenceRAG(actionData)) {
      systemPrompt += `
  * The action context (${actionData.type}) suggests knowledge base information would enhance the response`;
    }

    systemPrompt += `
- If ragNeeded is true, you MUST include the actual document IDs from the provided index
- Your analysis should guide response approach: tone, content focus, next steps, etc.
- Avoid referencing system terminology - focus on customer interaction strategy
- Remember: It's better to have relevant information available than to give vague responses`;

    return systemPrompt;
  }

  /**
   * Build user prompt with agent details, message, conversation context, and action context
   */
  private buildUserPrompt(
    agentPrompt: string, 
    userMessage: string, 
    kbIndex: string,
    conversationHistory?: ChatHistoryResult['conversationHistory'],
    actionData?: ActionData | null
  ): string {
    let prompt = `Agent Role and Instructions:
${agentPrompt}

${kbIndex}`;

    // Add action context if available
    if (actionData) {
      prompt += `\n\nACTION CONTEXT - CRITICAL FOR ANALYSIS:
This interaction is part of: ${actionData.name} (${actionData.type})
Description: ${actionData.description}

Action-Specific Guidance:
${actionData.prompt}

IMPORTANT: This action context provides specialized behavioral guidance that should influence your analysis of how to respond.`;
    }

    // Add conversation context if available
    if (conversationHistory && conversationHistory.conversationalContext) {
      prompt += `\n\nConversation Context:
${conversationHistory.conversationalContext}`;
    }

    prompt += `\n\nCurrent SMS Message to Analyze:
"${userMessage}"

Analyze this message and determine how the agent should respond based on:
1. The agent's role and capabilities
2. The conversation context${actionData ? `\n3. The specific action context (${actionData.name} - ${actionData.type})` : ''}
4. The user's current message and intent`;

    return prompt;
  }
}

export const agentPromptAnalysis = new AgentPromptAnalysis();