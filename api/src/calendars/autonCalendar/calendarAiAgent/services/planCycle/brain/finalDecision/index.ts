/**
 * Brain Stage 3 - Final Decision (LLM Call #2)
 * Makes final decision WITH calendar context
 * Outputs final tool plan
 */

import { claude4 } from '../../../../../../../llmModels/claude4';
import { FINAL_DECISION_SYSTEM_PROMPT } from './systemPrompt';
import { FINAL_DECISION_OUTPUT_FORMAT } from './outputFormat';
import { getRealWorldStateContext } from '../../../shared/realWorldStateContext';
import { TOOL_CONTEXT } from '../../promptBuilder/toolContext';
import type { BrainResponse } from '../../brain';
import type { BrainReviewOutput } from '../reviewPrompt';

/**
 * Make final decision with full context
 * This is LLM Call #2 - with calendar context loaded
 *
 * @param userRequest - The user's current request
 * @param conversationHistory - Recent chat history
 * @param calendarContext - Formatted calendar context (from pullContext)
 * @param reviewOutput - Output from Stage 1 review
 * @returns Final brain response with tool plan
 */
export async function finalDecision(
  userRequest: string,
  conversationHistory: string,
  calendarContext: string,
  reviewOutput: BrainReviewOutput
): Promise<BrainResponse> {
  console.log(`\n🧠 Brain Stage 3: Making Final Decision`);

  // Debug: Log calendar context to see what tasks/events are included
  console.log(`\n📋 Calendar Context Preview (first 500 chars):`);
  console.log(calendarContext.substring(0, 500));
  console.log(`\n📋 Checking for TASKS section: ${calendarContext.includes('TASKS:') ? '✓ Found' : '❌ Missing'}`);
  console.log(`📋 Checking for EVENTS section: ${calendarContext.includes('EVENTS:') ? '✓ Found' : '❌ Missing'}`);

  // Get current date/time context
  const realWorldContext = getRealWorldStateContext();

  // Build Stage 3 prompt from scratch
  const finalPrompt = `${FINAL_DECISION_SYSTEM_PROMPT}

${realWorldContext}

---

${TOOL_CONTEXT}

---

CONVERSATION HISTORY:
${conversationHistory}

---

CURRENT USER REQUEST:
${userRequest}

---

STAGE 1 ANALYSIS:
Response Type: ${reviewOutput.responseType}
Initial Message: ${reviewOutput.message}
Reasoning: ${reviewOutput.reasoning}
Tools Likely: ${reviewOutput.toolsLikely.join(', ') || 'None'}

---

CALENDAR CONTEXT:
${calendarContext || 'No calendar context needed for this request.'}

---

${FINAL_DECISION_OUTPUT_FORMAT}

---

Now make your FINAL decision about how to help the user.

Instructions:
1. Consider the user's request and conversation history
2. Use the calendar context to find existing tasks/events (you have the IDs)
3. Detect any conflicts or issues based on the context
4. Make intelligent suggestions based on current workload
5. Output your decision in the JSON format specified above

CRITICAL REMINDERS FOR READ QUERIES:
- Look at the CALENDAR CONTEXT section above
- If you see "TASKS:" section, you MUST include ALL tasks in your message
- If you see "EVENTS:" section, you MUST include ALL events in your message
- DO NOT omit any tasks or events that appear in the context
- Present them in a clear, organized format in your "message" field

CRITICAL REMINDER FOR WRITE OPERATIONS:
- If you say "I'll schedule", "I'll create", "I'll update", "I'll delete" in your message field
- You MUST include the corresponding tool (eventTool or taskTool) in your tools array
- DO NOT promise to do something without generating the tool to do it
- Example BAD: { "message": "I'll schedule that meeting", "tools": [] }
- Example GOOD: { "message": "I'll schedule that meeting", "tools": [{ "toolName": "eventTool", ... }] }

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any text before or after the JSON object. Start your response with { and end with }.
`;

  try {
    const response = await claude4.processText(finalPrompt);

    // Extract JSON
    let jsonContent = response.trim();
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No JSON found in LLM response');
    }

    jsonContent = jsonContent.substring(jsonStart, jsonEnd);

    // Parse response
    const parsed = JSON.parse(jsonContent) as BrainResponse;

    // Validate response
    if (!parsed.message) {
      throw new Error('Brain response missing "message" field');
    }

    // Ensure tools array exists
    if (!parsed.tools) {
      parsed.tools = [];
    }

    console.log(`✓ Final Decision Complete:`);
    console.log(`  Message: "${parsed.message.substring(0, 60)}..."`);
    console.log(`  Tools: ${parsed.tools.length} tool(s)`);

    if (parsed.tools.length > 0) {
      parsed.tools.forEach((tool, idx) => {
        console.log(`    ${idx + 1}. ${tool.toolName}: ${tool.intent}`);
      });
    }

    return parsed;

  } catch (error: any) {
    console.error(`❌ Error in brain finalDecision:`, error.message);
    throw new Error(`Brain final decision failed: ${error.message}`);
  }
}
