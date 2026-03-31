import { claude4 } from '../../../../llmModels/claude4';
import { AiJsonValidator } from '../../utils/aiJsonValidator';
import { promptBuilder } from '../memory/promptBuilder';

export interface PromptAnalysisResult {
  toolsNeeded: boolean;
  response: string;
}

export async function promptAnalysis(
  userPrompt: string, 
  tenantId: string,
  sessionId: string,
  conversationHistory?: Array<{role: 'user' | 'assistant', content: string}>
): Promise<PromptAnalysisResult> {
  try {
    console.log('>� Analyzing user prompt with Claude 4 and memory context...');
    console.log('>� User prompt:', userPrompt);

    // Build context-aware prompt using memory system
    const promptContext = await promptBuilder.buildPromptAnalysisContext(
      tenantId,
      sessionId,
      userPrompt
    );

    // Trim if needed to stay within token limits
    const finalContext = await promptBuilder.trimPromptIfNeeded(promptContext);

    console.log('>� Context built with', finalContext.metadata.messageCount, 'previous messages');
    console.log('>� Pipeline type:', finalContext.metadata.pipelineType);
    console.log('>� Stages already generated:', finalContext.metadata.stagesGenerated);

    // Enhanced system prompt for prompt analysis with JSON format requirement
    const systemPromptWithFormat = `${finalContext.systemPrompt}

CRITICAL: You must respond with a JSON object in this exact format:
{
  "toolsNeeded": boolean,
  "response": "your response text here"
}

BEHAVIOR GUIDELINES:
- Set "toolsNeeded" to true ONLY when you have enough information to create specific pipeline stages
- Set "toolsNeeded" to false when you need more information from the user
- Keep responses conversational and helpful
- Ask specific questions about the business process, customer journey, or decision points
- When ready to create stages, clearly state what stages you plan to create
- Consider the existing conversation context and pipeline information provided

RESPONSE EXAMPLES:
If more info needed:
{
  "toolsNeeded": false,
  "response": "I'd like to understand more about your specific process. What happens after a lead shows initial interest? Are there any approval steps or decision makers involved?"
}

If ready to create stages:
{
  "toolsNeeded": true,
  "response": "Perfect! Based on your description of your marketing agency process, I can create these stages: Free Website Lead, Exploration Call Scheduled, Exploration Call Completed, Security Fee Pending, Website Build In Progress, Follow-Up Call Scheduled, Project Complete. Should I create these stages for your pipeline?"
}`;
    
    // Get AI response using the context-aware prompt
    const aiResponse = await claude4.processTextWithSystemPrompt(
      systemPromptWithFormat, 
      `${finalContext.pipelineContext}

${finalContext.conversationHistory}

Current user message: ${userPrompt}`
    );
    
    console.log('>� Raw AI response:', aiResponse);

    // Parse and validate the JSON response using AI JSON validator
    const validationResult = AiJsonValidator.validateAndParse(aiResponse, 'Prompt Analysis');
    
    if (validationResult.success && validationResult.data) {
      // Additional schema validation for prompt analysis
      const schemaResult = AiJsonValidator.validatePromptAnalysis(validationResult.data);
      
      if (schemaResult.success && schemaResult.data) {
        console.log(' Successfully analyzed and validated prompt');
        console.log(' Tools needed:', schemaResult.data.toolsNeeded);
        console.log(' Repaired:', validationResult.repaired || false);
        
        return schemaResult.data;
      } else {
        console.error('L Schema validation failed:', schemaResult.error);
        console.log('= Using fallback analysis...');
        return AiJsonValidator.createPromptAnalysisFallback(aiResponse);
      }
    } else {
      console.error('L JSON parsing failed:', validationResult.error);
      console.log('= Using fallback analysis...');
      return AiJsonValidator.createPromptAnalysisFallback(aiResponse);
    }
  } catch (error) {
    console.error('L Error in prompt analysis:', error);
    
    // Return a safe fallback response
    return {
      toolsNeeded: false,
      response: "I'm having trouble processing your request right now. Could you please rephrase your pipeline requirements? I'm here to help you create an effective sales pipeline."
    };
  }
}