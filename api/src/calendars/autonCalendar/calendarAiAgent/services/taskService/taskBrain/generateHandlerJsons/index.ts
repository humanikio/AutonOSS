/**
 * Task Brain - Generate Handler JSONs (Stage 3 - LLM Call #2)
 * Creates specific JSON parameters for each handler call
 */

import { claude4 } from '../../../../../../../llmModels/claude4';
import { GENERATE_HANDLER_SYSTEM_PROMPT } from './systemPrompt';
import { GENERATE_HANDLER_OUTPUT_FORMAT } from './outputFormat';
import { getRealWorldStateContext } from '../../../shared/realWorldStateContext';
import type { ReviewPromptOutput } from '../reviewPrompt';

export interface HandlerCall {
  handler: 'createTaskHandler' | 'updateTaskHandler' | 'deleteTaskHandler' | 'readTaskHandler' | 'getTasksHandler';
  parameters: Record<string, any>;
}

export interface GenerateHandlerJsonsOutput {
  message: string; // Message to send to user explaining what's being executed
  reasoning: string;
  handlerCalls: HandlerCall[];
}

/**
 * Generate specific JSON parameters for each handler
 * LLM Call #2 - Uses detailed contexts and reasoning from stage 1
 *
 * @param reviewOutput - Operations determined in stage 1
 * @param detailedContext - Detailed handler contexts AND calendar context loaded in stage 2
 * @param brainProvidedContext - Context already discovered by main brain (e.g., taskId, eventId)
 * @returns Complete handler calls with parameters
 */
export async function generateHandlerJsons(
  reviewOutput: ReviewPromptOutput,
  detailedContext: string,
  brainProvidedContext?: Record<string, any>
): Promise<GenerateHandlerJsonsOutput> {
  console.log(`\n>🧠 Task Brain - Stage 3: Generating Handler JSONs`);
  if (brainProvidedContext && Object.keys(brainProvidedContext).length > 0) {
    console.log(`   Brain Provided:`, brainProvidedContext);
  }

  try {
    // Get current date/time context
    const realWorldContext = getRealWorldStateContext();

    // Build Stage 3 prompt from scratch
    const prompt = `${GENERATE_HANDLER_SYSTEM_PROMPT}

${realWorldContext}

---

STAGE 1 ANALYSIS:
Reasoning: ${reviewOutput.reasoning}

Operations Needed:
${JSON.stringify(reviewOutput.operations, null, 2)}

Calendar Context Requested: ${reviewOutput.contextRequest.needed ? 'Yes' : 'No'}
${reviewOutput.contextRequest.needed ? `Context Reasoning: ${reviewOutput.contextRequest.reasoning}` : ''}

---

${brainProvidedContext && Object.keys(brainProvidedContext).length > 0
  ? `BRAIN ALREADY RESOLVED CONTEXT:
${JSON.stringify(brainProvidedContext, null, 2)}

CRITICAL: The main brain has already discovered the above IDs/parameters.
Use these EXACT values in your handler JSON instead of searching calendar context.
For example, if taskId is provided above, use that exact taskId - do NOT search for it.

---

`
  : ''}
DETAILED CONTEXTS:
${detailedContext}

The above may include:
- Calendar context (tasks and events from the user's calendar)
- Detailed handler specifications for the operations you need to perform

${brainProvidedContext && Object.keys(brainProvidedContext).length > 0
  ? `Note: Since brain already provided IDs, calendar context is for validation only.`
  : `If calendar context is present, use it to:
- Find taskId/eventId for semantic updates/deletes
- Detect conflicts with existing items
- Link new tasks to related events
- Avoid creating duplicates`}

---

${GENERATE_HANDLER_OUTPUT_FORMAT}

---

Now generate COMPLETE JSON parameters for each handler call.

Instructions:
1. Review the Stage 1 operations needed
2. **PRIORITY**: If brain provided IDs (taskId, eventId, etc.), use those EXACT values
3. Use calendar context (if provided) to find IDs, detect conflicts, or link items (only if brain didn't provide)
4. Use the detailed handler specifications to understand parameters
5. Convert all relative times using CURRENT DATE & TIME context
6. Generate descriptive task names (not generic)
7. Output the exact number of handler calls specified in operations
8. Include ALL required parameters for each handler

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any text before or after the JSON object. Start your response with { and end with }.
`;

    // Call LLM
    const response = await claude4.processText(prompt);

    // Extract JSON
    let jsonContent = response.trim();
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No JSON found in LLM response');
    }

    jsonContent = jsonContent.substring(jsonStart, jsonEnd);

    // Parse response
    const parsed = JSON.parse(jsonContent) as GenerateHandlerJsonsOutput;

    // Validate response
    if (!parsed.message || !parsed.reasoning || !Array.isArray(parsed.handlerCalls)) {
      throw new Error('Invalid response structure from LLM - missing message, reasoning, or handlerCalls');
    }

    if (parsed.handlerCalls.length === 0) {
      console.log(`⚠️  LLM decided not to proceed - message will be posted to user`);
      console.log(`   Message: ${parsed.message.substring(0, 100)}...`);
      console.log(`   Reasoning: ${parsed.reasoning.substring(0, 100)}...`);
      // Return with empty handlerCalls - taskService will post message and exit gracefully
      return parsed;
    }

    if (parsed.handlerCalls.length > 4) {
      console.warn(`⚠️  More than 4 handler calls generated (${parsed.handlerCalls.length}), limiting to 4`);
      parsed.handlerCalls = parsed.handlerCalls.slice(0, 4);
    }

    console.log(`✓ Handler JSONs Generated`);
    console.log(`   Reasoning: ${parsed.reasoning.substring(0, 100)}...`);
    console.log(`   Handler Calls: ${parsed.handlerCalls.length}`);

    parsed.handlerCalls.forEach((call, idx) => {
      console.log(`\n   ${idx + 1}. ${call.handler}:`);
      console.log(`      Parameters:`);
      Object.entries(call.parameters).forEach(([key, value]) => {
        const displayValue = typeof value === 'string' && value.length > 50
          ? value.substring(0, 50) + '...'
          : JSON.stringify(value);
        console.log(`        ${key}: ${displayValue}`);
      });
    });

    return parsed;

  } catch (error: any) {
    console.error(`❌ Error in generateHandlerJsons:`, error.message);
    throw new Error(`Failed to generate handler JSONs: ${error.message}`);
  }
}
