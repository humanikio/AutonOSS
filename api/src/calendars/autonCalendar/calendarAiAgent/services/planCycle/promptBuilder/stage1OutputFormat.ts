/**
 * Stage 1 Output Format
 * Defines the JSON structure for brain's initial analysis (Stage 1)
 */

export const STAGE_1_OUTPUT_FORMAT = `
====================
STAGE 1 OUTPUT FORMAT
====================

You MUST respond with this JSON structure for Stage 1:

{
  "responseType": "chat" | "tools" | "hybrid",
  "message": "High-level response to user (1-2 sentences, brief acknowledgment)",
  "reasoning": "Your internal analysis of the request",
  "contextRequest": {
    "needed": boolean,
    "dateRange": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
    "includeTasks": boolean,
    "includeEvents": boolean,
    "taskFilters": { "status": "pending" | "completed" | "all", "priority": "low" | "medium" | "high" },
    "reasoning": "Why this context is needed"
  },
  "toolsLikely": ["taskTool", "eventTool"]  // Tools you think you'll need in Stage 3
}

Field Descriptions:

1. responseType:
   - "chat": Just responding to user, no tools needed
   - "tools": Need to use tools to complete request
   - "hybrid": Responding AND using tools

2. message:
   - High-level acknowledgment (1-2 sentences max)
   - Brief and friendly
   - Don't give execution details (that's for Stage 3)
   - Examples: "I'll help with that", "Let me check on that for you"

3. reasoning:
   - Your internal thought process
   - Why you chose this response type
   - What you're planning to do

4. contextRequest:
   - Specify exactly what calendar context you need
   - Be specific with date ranges
   - Only request what you actually need
   - If not needed, set needed: false

5. toolsLikely:
   - Array of tool names you think you'll use in Stage 3
   - Helps system prepare
   - Can be empty array if just chatting

====================
EXAMPLES
====================

Example 1 - Simple Greeting (No Tools, No Context):
User: "Hello!"
Response:
{
  "responseType": "chat",
  "message": "Hi! How can I help with your calendar today?",
  "reasoning": "Simple greeting, no calendar operations needed",
  "contextRequest": { "needed": false, "reasoning": "No calendar operations" },
  "toolsLikely": []
}

Example 2 - Semantic Task Update (Tools + Context):
User: "Update my dentist appointment to 3pm"
Response:
{
  "responseType": "tools",
  "message": "I'll update your dentist appointment to 3pm.",
  "reasoning": "Need to find dentist appointment by semantic description, then update time",
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-01", "end": "2026-01-31" },
    "includeTasks": true,
    "includeEvents": true,
    "reasoning": "Need to find 'dentist' appointment semantically - could be task or event"
  },
  "toolsLikely": ["taskTool", "eventTool"]
}

Example 3 - Conflict Detection (Tools + Context):
User: "Schedule team meeting at 2pm today"
Response:
{
  "responseType": "tools",
  "message": "I'll schedule that team meeting for you.",
  "reasoning": "Creating new event but should check for conflicts first",
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-05", "end": "2025-12-05" },
    "includeTasks": false,
    "includeEvents": true,
    "reasoning": "Check today's schedule for conflicts at 2pm before creating"
  },
  "toolsLikely": ["eventTool"]
}

Example 4 - Simple Task Creation (Tools, No Context):
User: "Create task 'Buy milk' for tomorrow"
Response:
{
  "responseType": "tools",
  "message": "I'll create that task for you.",
  "reasoning": "Straightforward task creation with all details provided",
  "contextRequest": {
    "needed": false,
    "reasoning": "All details provided, no conflicts to check, no semantic finding needed"
  },
  "toolsLikely": ["taskTool"]
}

Example 5 - Workload Check (Hybrid - Chat + Maybe Tools):
User: "What do I have today?"
Response:
{
  "responseType": "hybrid",
  "message": "Let me check your schedule for today.",
  "reasoning": "Need to fetch today's schedule and present it to user",
  "contextRequest": {
    "needed": true,
    "dateRange": { "start": "2025-12-05", "end": "2025-12-05" },
    "includeTasks": true,
    "includeEvents": true,
    "reasoning": "Need to see all of today's tasks and events to summarize for user"
  },
  "toolsLikely": []
}

====================
CRITICAL RULES
====================

1. ALWAYS include all required fields
2. Be brief in the message field (1-2 sentences)
3. Be specific with date ranges (don't request "all time")
4. Only request context you actually need
5. Output ONLY valid JSON, nothing before or after
6. This is STAGE 1 - you're just planning, not executing yet
`;
