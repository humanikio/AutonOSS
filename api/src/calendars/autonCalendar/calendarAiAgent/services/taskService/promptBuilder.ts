/**
 * Task Service Prompt Builder (Stage 1)
 * Compiles prompt with basic handler descriptions for initial operation review
 */

import { SYSTEM_PROMPT } from './promptBuilder/systemPrompt';
import { HANDLER_DESCRIPTIONS } from './promptBuilder/taskHandlerContext/index';
import { TASK_CALENDAR_CONTEXT_INSTRUCTIONS } from './promptBuilder/calendarContext';
import { getRealWorldStateContext } from '../shared/realWorldStateContext';

export interface BuildPromptInput {
  userIntent: string; // From brain's tool context
  userRequest: string; // Original request from brain
  calendarId: string;
  brainProvidedContext?: Record<string, any>; // Context already discovered by brain (e.g., taskId, eventId)
}

/**
 * Build prompt for Stage 1 (reviewPrompt)
 * Uses BASIC handler descriptions only - detailed contexts loaded later if needed
 *
 * @param input - User intent and request from main brain
 * @returns Compiled prompt for operation review
 */
export async function buildPrompt(input: BuildPromptInput): Promise<string> {
  const { userIntent, userRequest, calendarId, brainProvidedContext } = input;

  console.log(`\n=� Building Stage 1 Prompt (Review Operations)`);
  console.log(`   Calendar ID: ${calendarId}`);
  console.log(`   User Intent: ${userIntent}`);
  if (brainProvidedContext && Object.keys(brainProvidedContext).length > 0) {
    console.log(`   Brain Provided Context:`, brainProvidedContext);
  }

  // Get current date/time context
  const realWorldContext = getRealWorldStateContext();

  const prompt = `
${SYSTEM_PROMPT}

${realWorldContext}

====================
HANDLER OPTIONS
====================
${HANDLER_DESCRIPTIONS}

---

${TASK_CALENDAR_CONTEXT_INSTRUCTIONS}

====================
CURRENT REQUEST
====================

Calendar ID: ${calendarId}

Main Brain's Assessment:
${userIntent}

Original User Request:
${userRequest}

${brainProvidedContext && Object.keys(brainProvidedContext).length > 0
  ? `Brain Already Resolved Context:
${JSON.stringify(brainProvidedContext, null, 2)}

IMPORTANT: The brain has already identified specific IDs/parameters above.
Use these directly instead of requesting calendar context to re-discover them.
For example, if taskId is provided, you do NOT need to fetch calendar context to find it.
`
  : ''}
====================
YOUR TASK (Stage 1 - Operation Review)
====================

Analyze this request and determine:
1. What calendar context (if any) you need
2. Which handler(s) are needed to accomplish this
3. How many times each handler should be called
4. Brief summary of what each operation will do

This is STAGE 1 - you are NOT generating full parameters yet.
Your job is to:
- Identify what calendar context you need (tasks, events, date ranges)
- Identify which operations are needed so we can load the right detailed contexts

OUTPUT FORMAT (JSON):
{
  "reasoning": "string - your internal analysis of what needs to be done",
  "contextRequest": {
    "needed": boolean,
    "dateRange": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
    "includeTasks": boolean,
    "includeEvents": boolean,
    "taskFilters": { "status": "pending" | "completed" | "all", "priority": "low" | "medium" | "high" },
    "reasoning": "Why this context is needed"
  },
  "operations": [
    {
      "handler": "create | update | delete | read | getTasks",
      "count": number,
      "summary": "string - brief description of this operation"
    }
  ]
}

IMPORTANT:
- If brain provided IDs/context (taskId, eventId, etc.), set contextRequest.needed = false
- Only request calendar context if you need to discover IDs semantically
- Determine if you need calendar context (semantic finding, conflict detection, event linking, etc.)
- Maximum 4 total operations
- Be specific about count (e.g., create 2 tasks = count: 2)
- Output ONLY valid JSON, no other text

Example 1 - Brain Already Provided ID (No Context Needed):
{
  "reasoning": "Brain already identified taskId, can delete directly without calendar fetch",
  "contextRequest": {
    "needed": false,
    "reasoning": "Brain already resolved taskId - no semantic search needed"
  },
  "operations": [
    { "handler": "delete", "count": 1, "summary": "Delete task using provided taskId" }
  ]
}

Example 2 - Need Context for Semantic Finding:
{
  "reasoning": "Need to find 'dentist' task by semantic search, then mark it complete",
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2026-01-31" },
    "includeTasks": true,
    "includeEvents": false,
    "taskFilters": { "status": "pending" },
    "reasoning": "Find 'dentist' task without explicit ID - brain didn't provide taskId"
  },
  "operations": [
    { "handler": "update", "count": 1, "summary": "Mark dentist task as completed" }
  ]
}

Example 3 - Simple Creation (No Context):
{
  "reasoning": "Simple task creation with all details provided, no context needed",
  "contextRequest": {
    "needed": false,
    "reasoning": "All details provided, no conflicts to check, no semantic finding needed"
  },
  "operations": [
    { "handler": "create", "count": 1, "summary": "Create 'Buy milk' task for tomorrow" }
  ]
}
  `.trim();

  return prompt;
}
