import { ClaudeResponse } from './callClaude';
import { toolController } from '../controllers/toolController';

export interface ProcessedAiResponse {
  chatResponse: string;
  toolExecuted: boolean;
  toolResult?: any;
  documentUpdated: boolean;
}

export class AiResponseHandler {
  
  async handleAiResponse(
    claudeResponse: ClaudeResponse,
    tenantId: string,
    docId: string
  ): Promise<ProcessedAiResponse> {
    try {
      const result: ProcessedAiResponse = {
        chatResponse: claudeResponse.response,
        toolExecuted: false,
        documentUpdated: false
      };

      // Check if Claude wants to use a tool
      if (claudeResponse.tool && claudeResponse.tool === 'aiDocEdit') {
        console.log('Claude requested document edit tool');
        
        try {
          // Execute the tool via toolController
          const toolResult = await toolController.executeTool(
            'aiDocEdit',
            {
              tenantId,
              docId,
              ...claudeResponse.toolParams
            }
          );

          result.toolExecuted = true;
          result.toolResult = toolResult;
          result.documentUpdated = toolResult.success || false;

          console.log('Tool execution result:', toolResult);

        } catch (toolError) {
          console.error('Error executing tool:', toolError);
          // Don't throw - we still want to return the chat response
          result.chatResponse += '\n\n*Note: I attempted to update the document but encountered an error.*';
        }
      }

      return result;

    } catch (error) {
      console.error('Error handling AI response:', error);
      
      // Fallback: return basic response
      return {
        chatResponse: claudeResponse.response,
        toolExecuted: false,
        documentUpdated: false
      };
    }
  }

  /**
   * Clean and validate JSON response from Claude
   */
  static cleanJsonResponse(rawResponse: string): string {
    try {
      // Remove markdown code blocks if present
      let cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Remove any leading/trailing text outside JSON
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      // Validate it's proper JSON
      JSON.parse(cleaned);
      
      return cleaned;
    } catch (error) {
      console.error('Could not clean JSON response:', error);
      throw new Error('Invalid JSON response from Claude');
    }
  }

  /**
   * Extract and validate required fields from Claude response
   */
  static validateClaudeResponse(parsed: any): ClaudeResponse {
    const response: ClaudeResponse = {
      response: parsed.response || 'I apologize, but I couldn\'t generate a proper response.',
      tool: null,
      toolParams: {}
    };

    // Validate tool field
    if (parsed.tool === 'aiDocEdit') {
      response.tool = 'aiDocEdit';
      response.toolParams = parsed.toolParams || {};
      
      // Ensure required tool parameters
      if (!response.toolParams.content) {
        console.warn('aiDocEdit tool called without content parameter');
        response.tool = null; // Disable tool if missing required params
      }
    }

    return response;
  }
}

export const aiResponseHandler = new AiResponseHandler();