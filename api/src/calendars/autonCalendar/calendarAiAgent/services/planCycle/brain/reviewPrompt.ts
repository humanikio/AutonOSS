/**
 * Brain Stage 1 - Review Prompt (LLM Call #1)
 * Analyzes user request and determines:
 * - Response type (chat vs tools)
 * - Calendar context needs
 * - Likely tools needed
 */

import { claude4 } from '../../../../../../llmModels/claude4';

export interface ContextRequest {
  needed: boolean;              // Does this request need calendar context?
  dateRange?: {
    start: string;              // ISO date
    end: string;                // ISO date
  };
  includeTasks?: boolean;
  includeEvents?: boolean;
  taskFilters?: {
    status?: 'pending' | 'completed' | 'all';
    priority?: 'low' | 'medium' | 'high';
  };
  reasoning: string;            // Why this context is needed
}

export interface BrainReviewOutput {
  responseType: 'chat' | 'tools' | 'hybrid';
  message: string;                    // High-level response to user
  reasoning: string;                  // Internal reasoning
  contextRequest: ContextRequest;     // What calendar context to fetch
  toolsLikely: string[];              // Likely tools needed (helps Stage 2)
}

/**
 * Stage 1: Analyze request and determine context needs
 * This is LLM Call #1 - quick analysis without full context
 *
 * @param compiledPrompt - Full prompt from promptBuilder
 * @returns Analysis with context requirements
 */
export async function reviewPrompt(
  compiledPrompt: string
): Promise<BrainReviewOutput> {
  console.log(`\n🧠 Brain Stage 1: Reviewing Request`);

  try {
    const promptWithJsonInstruction = `${compiledPrompt}

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any text before or after the JSON object. Start your response with { and end with }.`;

    const response = await claude4.processText(promptWithJsonInstruction);

    // Extract JSON
    let jsonContent = response.trim();
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No JSON found in LLM response');
    }

    jsonContent = jsonContent.substring(jsonStart, jsonEnd);

    // Parse response
    const parsed = JSON.parse(jsonContent) as BrainReviewOutput;

    // Validate response
    if (!parsed.responseType || !parsed.message || !parsed.contextRequest) {
      throw new Error('Invalid response structure from LLM - missing required fields');
    }

    console.log(`✓ Brain Review Complete:`);
    console.log(`  Response Type: ${parsed.responseType}`);
    console.log(`  Context Needed: ${parsed.contextRequest.needed}`);
    if (parsed.contextRequest.needed && parsed.contextRequest.dateRange) {
      console.log(`  Date Range: ${parsed.contextRequest.dateRange.start} to ${parsed.contextRequest.dateRange.end}`);
      console.log(`  Include Tasks: ${parsed.contextRequest.includeTasks !== false}`);
      console.log(`  Include Events: ${parsed.contextRequest.includeEvents !== false}`);
    }
    console.log(`  Tools Likely: ${parsed.toolsLikely.join(', ') || 'none'}`);

    return parsed;

  } catch (error: any) {
    console.error(`❌ Error in brain reviewPrompt:`, error.message);
    throw new Error(`Failed to review prompt: ${error.message}`);
  }
}
