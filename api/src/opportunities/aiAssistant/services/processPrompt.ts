import { promptAnalysis, PromptAnalysisResult } from './processPrompt/promptAnalysis';
import { generateStages } from './processPrompt/generateStages';
import { db } from '../../../config/firestore';
import { AISessionData } from './startSession/createFirestoreDocument';

export interface ProcessPromptResult {
  sessionId: string;
  aiResponse: PromptAnalysisResult;
  updated: boolean;
}

export async function processPrompt(
  tenantId: string,
  sessionId: string,
  userPrompt: string
): Promise<ProcessPromptResult> {
  try {
    console.log('= Processing prompt for session:', sessionId);
    console.log('= User prompt:', userPrompt);

    // Get existing session data to build conversation history
    const sessionRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('pipelines')
      .doc('main')
      .collection('aiAssistant')
      .doc('main')
      .collection('sessions')
      .doc(sessionId);

    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      throw new Error(`AI session ${sessionId} not found`);
    }

    const sessionData = sessionDoc.data() as AISessionData;
    
    // Extract conversation history for context
    const conversationHistory = sessionData.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log('= Found existing conversation with', conversationHistory.length, 'messages');

    // Analyze the prompt using our AI service with memory context
    const aiResponse = await promptAnalysis(userPrompt, tenantId, sessionId, conversationHistory);

    console.log('= AI analysis result:', aiResponse);

    // If AI indicates tools are needed (ready to create stages), call generateStages
    if (aiResponse.toolsNeeded) {
      console.log('= AI indicates tools needed - generating stages...');
      
      // First update session with user message and AI analysis
      const now = new Date().toISOString();
      const updatedMessagesWithAnalysis = [
        ...sessionData.messages,
        {
          role: 'user' as const,
          content: userPrompt,
          timestamp: now
        },
        {
          role: 'assistant' as const,
          content: aiResponse.response,
          timestamp: now
        }
      ];

      // Update session with analysis first
      await sessionRef.update({
        messages: updatedMessagesWithAnalysis,
        messageCount: (sessionData.messageCount || sessionData.messages.length) + 2,
        metadata: {
          ...sessionData.metadata,
          toolsAvailable: true,
          currentStage: 'generating_stages',
          lastInteraction: now
        },
        updatedAt: now
      });

      // Generate stages
      const stageResult = await generateStages(tenantId, sessionId, userPrompt, aiResponse);
      
      console.log('= Stage generation completed:', stageResult);

      return {
        sessionId,
        aiResponse: {
          ...aiResponse,
          response: stageResult.aiResponse,
          toolsNeeded: false // Tools have been used
        },
        updated: true
      };
    } else {
      // Normal flow - just analysis without stage generation
      const now = new Date().toISOString();
      
      const updatedMessages = [
        ...sessionData.messages,
        {
          role: 'user' as const,
          content: userPrompt,
          timestamp: now
        },
        {
          role: 'assistant' as const,
          content: aiResponse.response,
          timestamp: now
        }
      ];

      // Update metadata based on AI response
      const updatedMetadata = {
        ...sessionData.metadata,
        toolsAvailable: aiResponse.toolsNeeded,
        currentStage: 'analysis',
        lastInteraction: now
      };

      // Update the session document
      await sessionRef.update({
        messages: updatedMessages,
        messageCount: (sessionData.messageCount || sessionData.messages.length) + 2,
        metadata: updatedMetadata,
        updatedAt: now
      });

      console.log(' Session updated with new interaction');

      return {
        sessionId,
        aiResponse,
        updated: true
      };
    }
  } catch (error) {
    console.error('L Error processing prompt:', error);
    throw new Error(`Failed to process prompt: ${(error as Error).message}`);
  }
}