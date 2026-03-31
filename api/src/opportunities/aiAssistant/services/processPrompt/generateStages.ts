import { claude4 } from '../../../../llmModels/claude4';
import { db } from '../../../../config/firestore';
import { AISessionData } from '../startSession/createFirestoreDocument';
import { getPipelineFromSession } from '../../utils/getPipeline';
import { addStages, StageToCreate, AddStagesResult } from '../../tools/addStages';
import { PromptAnalysisResult } from './promptAnalysis';
import { AiJsonValidator } from '../../utils/aiJsonValidator';
import { promptBuilder } from '../memory/promptBuilder';

export interface GenerateStagesResult {
  success: boolean;
  stagesCreated: number;
  stages: StageToCreate[];
  aiResponse: string;
  totalStages: number;
}

export async function generateStages(
  tenantId: string,
  sessionId: string,
  userPrompt: string,
  previousAnalysis: PromptAnalysisResult
): Promise<GenerateStagesResult> {
  try {
    console.log('🎯 Generating stages with memory context for session:', sessionId);
    console.log('🎯 User prompt:', userPrompt);
    console.log('🎯 Previous analysis:', previousAnalysis);

    // Build context-aware prompt for stage generation using memory system
    const stageContext = await promptBuilder.buildStageGenerationContext(
      tenantId,
      sessionId,
      userPrompt,
      previousAnalysis
    );

    // Trim if needed to stay within token limits
    const finalContext = await promptBuilder.trimPromptIfNeeded(stageContext);

    console.log('🎯 Stage generation context built:');
    console.log('🎯 - Message count:', finalContext.metadata.messageCount);
    console.log('🎯 - Pipeline type:', finalContext.metadata.pipelineType);
    console.log('🎯 - Stages previously generated:', finalContext.metadata.stagesGenerated);

    // Enhanced system prompt specifically for stage generation
    const enhancedSystemPrompt = `You are an expert sales pipeline consultant specialized in creating optimized pipeline stages. 

TASK: Generate a complete set of pipeline stages that represent the most efficient and practical progression for the business process described by the user.

CRITICAL: You must respond with a JSON object in this exact format:
{
  "stages": [
    {
      "name": "Stage Name",
      "order": 0
    }
  ],
  "explanation": "Brief explanation of the stage progression logic"
}

STAGE GENERATION RULES:
1. Create 3-7 stages that represent key decision points or milestones
2. Order stages from 0 (first stage) to N (final stage)
3. Use clear, actionable stage names (e.g., "Lead Qualification", "Proposal Sent", "Contract Signed")
4. Consider the natural flow of the business process
5. Include key decision points where deals might progress or be lost
6. Focus on stages that sales teams can easily understand and action
7. Consider any existing stages and how new stages should integrate
8. Ensure stages represent practical, measurable steps in the sales process

EXAMPLES OF GOOD STAGE PROGRESSIONS:

B2B Software Sales:
1. Lead Qualification (order: 0)
2. Discovery Call Scheduled (order: 1) 
3. Demo Completed (order: 2)
4. Proposal Sent (order: 3)
5. Negotiation (order: 4)
6. Contract Signed (order: 5)

Marketing Agency:
1. Initial Inquiry (order: 0)
2. Consultation Scheduled (order: 1)
3. Proposal Presented (order: 2)
4. Contract Negotiation (order: 3)
5. Project Started (order: 4)
6. Project Completed (order: 5)

Generate stages that make sense for the specific business described in the conversation.`;

    console.log('🎯 Sending to Claude 4 for context-aware stage generation...');
    
    // Get AI response using the context-aware prompt
    const aiResponse = await claude4.processTextWithSystemPrompt(
      enhancedSystemPrompt,
      finalContext.fullPrompt
    );
    
    console.log('🎯 Raw AI response:', aiResponse);

    // Parse and validate the JSON response using AI JSON validator
    const validationResult = AiJsonValidator.validateAndParse(aiResponse, 'Stage Generation');
    let parsedResponse: { stages: StageToCreate[]; explanation: string };
    
    if (validationResult.success && validationResult.data) {
      // Additional schema validation for stage generation
      const schemaResult = AiJsonValidator.validateStageGeneration(validationResult.data);
      
      if (schemaResult.success && schemaResult.data) {
        console.log('🎯 Successfully parsed and validated stage generation');
        console.log('🎯 Repaired:', validationResult.repaired || false);
        parsedResponse = schemaResult.data;
      } else {
        console.error('❌ Stage generation schema validation failed:', schemaResult.error);
        console.log('🔄 Using fallback stage generation...');
        parsedResponse = AiJsonValidator.createStageGenerationFallback(aiResponse);
      }
    } else {
      console.error('❌ Stage generation JSON parsing failed:', validationResult.error);
      console.log('🔄 Using fallback stage generation...');
      parsedResponse = AiJsonValidator.createStageGenerationFallback(aiResponse);
    }

    console.log('🎯 Parsed stages:', parsedResponse.stages);
    console.log('🎯 AI explanation:', parsedResponse.explanation);

    // Add stages to the session (not production pipeline)
    const addResult: AddStagesResult = await addStages(
      tenantId,
      sessionId,
      parsedResponse.stages
    );

    console.log('🎯 Add stages result:', addResult);

    // Get session data and reference for updating
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

    // Update session with the stage generation response
    const now = new Date().toISOString();
    const responseMessage = `Great! I've analyzed your business process and created ${parsedResponse.stages.length} pipeline stages for your review:

${parsedResponse.stages.map((stage, index) => `${index + 1}. **${stage.name}**`).join('\n')}

${parsedResponse.explanation}

${addResult.success 
  ? `✅ Successfully created ${addResult.createdStages.length} stages in your session! Total stages: ${addResult.totalStages}

*Note: These stages are currently saved in your session for review. They won't affect your production pipeline until you choose to apply them.*` 
  : '❌ There was an issue creating some stages. Please try again.'
}`;

    // Add AI response to session
    const updatedMessages = [
      ...sessionData.messages,
      {
        role: 'assistant' as const,
        content: responseMessage,
        timestamp: now
      }
    ];

    // Update session metadata
    const updatedMetadata = {
      ...sessionData.metadata,
      toolsAvailable: false,
      currentStage: 'completed',
      stagesGenerated: true,
      stageCount: addResult.totalStages,
      lastInteraction: now
    };

    // Update the session document
    await sessionRef.update({
      messages: updatedMessages,
      metadata: updatedMetadata,
      updatedAt: now
    });

    console.log('🎯 Session updated with stage generation results');

    return {
      success: addResult.success,
      stagesCreated: addResult.createdStages.length,
      stages: parsedResponse.stages,
      aiResponse: responseMessage,
      totalStages: addResult.totalStages
    };
  } catch (error) {
    console.error('❌ Error generating stages:', error);
    throw new Error(`Failed to generate stages: ${(error as Error).message}`);
  }
}