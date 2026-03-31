import Claude4Model from '../../llmModels/claude4';
import { promptBuilder } from './memory/promptBuilder';

export interface ClaudeRequest {
  tenantId: string;
  docId: string;
  chatId: string;
  userMessage: string;
}

export interface ClaudeResponse {
  response: string;
  tool: string | null;
  toolParams?: any;
}

export class ClaudeService {
  private claude4Model: Claude4Model;

  constructor() {
    this.claude4Model = new Claude4Model();
  }

  async callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
    try {
      // Build base prompt with full context
      const promptContext = await promptBuilder.buildPrompt(
        request.tenantId,
        request.docId,
        request.chatId,
        request.userMessage
      );

      // Add JSON format instructions and tool definitions
      const enhancedPrompt = this.buildEnhancedPrompt(promptContext.fullPrompt);

      // Call Claude with enhanced prompt
      const rawResponse = await this.claude4Model.processText(enhancedPrompt);

      // Parse JSON response
      const parsedResponse = this.parseClaudeResponse(rawResponse);

      return parsedResponse;

    } catch (error) {
      console.error('Error calling Claude:', error);
      throw new Error('Failed to process Claude request');
    }
  }

  private buildEnhancedPrompt(basePrompt: string): string {
    const toolInstructions = `

IMPORTANT: You must respond in JSON format with the following structure:
{
  "response": "Your helpful response to the user",
  "tool": null or "aiDocEdit",
  "toolParams": {
    "content": "Updated document content if editing",
    "reason": "Brief explanation of why you're editing"
  }
}

AVAILABLE TOOLS:
1. "aiDocEdit" - Use this tool when:
   - User provides new information that should be added to the document
   - User corrects or clarifies content in the document
   - User asks you to update, improve, or reorganize the document content
   - User provides company details, procedures, or information that should be documented

TOOL USAGE GUIDELINES:
- Set "tool": "aiDocEdit" when you need to modify the document
- Set "tool": null when just providing conversational help
- Include the complete updated document content in toolParams.content
- Always provide a helpful response in the "response" field
- Be conservative - only edit when there's clear intent to update the document

Remember: The user is working on a knowledge base document. If they provide information that should be preserved in the document, use the aiDocEdit tool to update it.

${basePrompt}

Respond in valid JSON format only:`;

    return toolInstructions;
  }

  private parseClaudeResponse(rawResponse: string): ClaudeResponse {
    try {
      // Try to extract JSON from response (handles cases where Claude adds extra text)
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        // Fallback: treat as plain response
        return {
          response: rawResponse,
          tool: null
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.response) {
        parsed.response = rawResponse;
      }

      if (!parsed.tool) {
        parsed.tool = null;
      }

      return {
        response: parsed.response,
        tool: parsed.tool === 'aiDocEdit' ? 'aiDocEdit' : null,
        toolParams: parsed.toolParams || {}
      };

    } catch (error) {
      console.error('Error parsing Claude response:', error);
      // Fallback to plain response
      return {
        response: rawResponse,
        tool: null
      };
    }
  }
}

export const claudeService = new ClaudeService();