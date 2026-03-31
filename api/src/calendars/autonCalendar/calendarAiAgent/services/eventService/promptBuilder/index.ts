/**
 * Event Service Prompt Builder (Stage 1)
 * Compiles prompt with basic handler descriptions for initial operation review
 */

import { SYSTEM_PROMPT } from './systemPrompt';
import { HANDLER_DESCRIPTIONS } from './eventHandlerContext';
import { EVENT_CALENDAR_CONTEXT_INSTRUCTIONS } from './calendarContext';
import { getRealWorldStateContext } from '../../shared/realWorldStateContext';

export interface BuildPromptInput {
  userIntent: string; // From brain's tool context
  userRequest: string; // Original request from brain
  calendarId: string;
}

/**
 * Build prompt for Stage 1 (reviewPrompt)
 * Uses BASIC handler descriptions only - detailed contexts loaded later if needed
 *
 * @param input - User intent and request from main brain
 * @returns Compiled prompt for operation review
 */
export async function buildPrompt(input: BuildPromptInput): Promise<string> {
  const { userIntent, userRequest, calendarId } = input;

  console.log(`\n=📋 Building Stage 1 Prompt (Review Operations)`);
  console.log(`   Calendar ID: ${calendarId}`);
  console.log(`   User Intent: ${userIntent}`);

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

${EVENT_CALENDAR_CONTEXT_INSTRUCTIONS}

====================
CURRENT REQUEST
====================

Calendar ID: ${calendarId}

Main Brain's Assessment:
${userIntent}

Original User Request:
${userRequest}

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
      "handler": "create | update | delete | read | getEvents",
      "count": number,
      "summary": "string - brief description of this operation"
    }
  ]
}

IMPORTANT:
- Determine if you need calendar context (semantic finding, conflict detection, task/event linking, etc.)
- Maximum 4 total operations
- Be specific about count (e.g., create 2 events = count: 2)
- If uncertain about eventId, request calendar context to find it semantically
- Output ONLY valid JSON, no other text

Example 1 - With Context (Semantic Finding):
{
  "reasoning": "Need to find 'meeting with Sarah' event by semantic search, then cancel it",
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2026-01-31" },
    "includeTasks": false,
    "includeEvents": true,
    "reasoning": "Find 'Sarah' event without explicit ID"
  },
  "operations": [
    { "handler": "delete", "count": 1, "summary": "Cancel meeting with Sarah" }
  ]
}

Example 2 - No Context (Simple Creation):
{
  "reasoning": "Simple event creation with all details provided, no context needed",
  "contextRequest": {
    "needed": false,
    "reasoning": "All details provided, no conflicts to check, no semantic finding needed"
  },
  "operations": [
    { "handler": "create", "count": 1, "summary": "Create 'Team Standup' meeting for tomorrow at 10am" }
  ]
}

Example 3 - With Context (Conflict Detection):
{
  "reasoning": "Creating event at specific time, should check for conflicts",
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-05", "end": "2025-12-05" },
    "reasoning": "Check for time conflicts at 2pm today - need both tasks and events"
  },
  "operations": [
    { "handler": "create", "count": 1, "summary": "Create client call at 2pm if no conflicts" }
  ]
}
  `.trim();

  return prompt;
}
