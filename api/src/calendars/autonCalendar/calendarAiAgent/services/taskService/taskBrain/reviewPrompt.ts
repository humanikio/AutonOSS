/**
 * Task Brain - Review Prompt (Stage 1 - LLM Call #1)
 * Analyzes request and determines which operations are needed
 */

import { claude4 } from '../../../../../../llmModels/claude4';
import type { HandlerType } from '../promptBuilder/taskHandlerContext/index';

export interface OperationReview {
  handler: HandlerType;
  count: number;
  summary: string;
}

export interface ContextRequest {
  needed: boolean;
  dateRange?: {
    start: string; // ISO date
    end: string;
  };
  includeTasks?: boolean;
  includeEvents?: boolean;
  taskFilters?: {
    status?: 'pending' | 'completed' | 'all';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
  reasoning: string;
}

export interface ReviewPromptOutput {
  message?: string; // Optional - no longer posted to user (brain handles messaging)
  reasoning: string;
  contextRequest: ContextRequest;
  operations: OperationReview[];
}

/**
 * Review user request and determine which operations are needed
 * LLM Call #1 - Uses basic handler descriptions to identify operations
 *
 * @param compiledPrompt - Full prompt from promptBuilder (stage 1)
 * @returns Operations needed to fulfill request
 */
export async function reviewPrompt(
  compiledPrompt: string
): Promise<ReviewPromptOutput> {
  console.log(`\n>� Task Brain - Stage 1: Reviewing Operations`);

  try {
    // Add JSON enforcement
    const promptWithJsonInstruction = `${compiledPrompt}

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any text before or after the JSON object. Start your response with { and end with }.`;

    // Call LLM
    const response = await claude4.processText(promptWithJsonInstruction);

    // Extract JSON (in case Claude adds extra text)
    let jsonContent = response.trim();
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No JSON found in LLM response');
    }

    jsonContent = jsonContent.substring(jsonStart, jsonEnd);

    // Parse response
    const parsed = JSON.parse(jsonContent) as ReviewPromptOutput;

    // Validate response
    if (!parsed.reasoning || !Array.isArray(parsed.operations)) {
      throw new Error('Invalid response structure from LLM - missing reasoning or operations');
    }

    // Calculate total operations
    const totalOps = parsed.operations.reduce((sum, op) => sum + op.count, 0);

    console.log(` Review Complete`);
    console.log(`   Reasoning: ${parsed.reasoning.substring(0, 100)}...`);
    console.log(`   Operations: ${parsed.operations.length} types, ${totalOps} total calls`);

    parsed.operations.forEach((op, idx) => {
      console.log(`   ${idx + 1}. ${op.handler} (x${op.count}): ${op.summary}`);
    });

    return parsed;

  } catch (error: any) {
    console.error(`L Error in reviewPrompt:`, error.message);
    throw new Error(`Failed to review prompt: ${error.message}`);
  }
}
