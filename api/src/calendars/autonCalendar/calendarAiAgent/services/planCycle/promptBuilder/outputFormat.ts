/**
 * Output Format
 * Defines the JSON structure for brain responses
 */

export const OUTPUT_FORMAT = `Response Format:

You MUST respond in valid JSON format with this EXACT structure:

{
  "message": "string (REQUIRED - what you'll tell the user)",
  "reasoning": "string (your internal thought process)",
  "tools": [
    {
      "toolName": "eventTool" | "taskTool",
      "intent": "string (clear description of what this tool should accomplish)",
      "context": {
        "userRequest": "string (extracted user intent in your own words)",
        "parameters": {
          // All relevant details you identified from the conversation
          // Be specific and include everything needed
        }
      }
    }
  ]
}

Field Requirements:

1. message (REQUIRED)
   - High-level acknowledgment of user's request
   - Be brief, conversational, and friendly (1-2 sentences max)
   - Confirm you understand what they want
   - DO NOT give detailed execution steps (tools will provide those)
   - Examples: "I'll help you with that", "I'll take care of that for you", "Let me check on that"

2. reasoning (REQUIRED)
   - Your internal thought process
   - Why you chose these tools
   - What assumptions you made
   - What clarifications might be needed

3. tools (OPTIONAL array)
   - Empty array [] if no actions needed
   - One or more tool objects if actions required
   - Each tool must have: toolName, intent, context

Tool Object Structure:

- toolName: Must be exactly "eventTool" or "taskTool"
- intent: Clear, specific description of what the tool should do
  Example: "Create a team meeting event for tomorrow at 2pm with 5 attendees"
- context.userRequest: Restate the user's intent in your own words
- context.parameters: Object with ALL relevant details

Example 1 - Create Event:
{
  "message": "I'll schedule that team meeting for you.",
  "reasoning": "User wants a meeting scheduled. I have the time and general purpose. I'll use a default 1-hour duration since it wasn't specified.",
  "tools": [
    {
      "toolName": "eventTool",
      "intent": "Create a new team meeting event for tomorrow at 2pm",
      "context": {
        "userRequest": "schedule a team meeting tomorrow afternoon",
        "parameters": {
          "action": "create",
          "eventType": "meeting",
          "eventName": "Team Meeting",
          "startTime": "tomorrow at 2pm",
          "duration": "1 hour",
          "attendees": "team members"
        }
      }
    }
  ]
}

Example 2 - Multiple Tools:
{
  "message": "I'll set that up for you.",
  "reasoning": "User needs both an event and a preparation task. The event is time-specific, the task is action-oriented.",
  "tools": [
    {
      "toolName": "eventTool",
      "intent": "Create client presentation event on Friday at 10am",
      "context": {
        "userRequest": "schedule client presentation Friday morning",
        "parameters": {
          "action": "create",
          "eventType": "meeting",
          "eventName": "Client Presentation",
          "startTime": "Friday at 10am",
          "duration": "1 hour",
          "location": "not specified"
        }
      }
    },
    {
      "toolName": "taskTool",
      "intent": "Create task to prepare presentation slides",
      "context": {
        "userRequest": "prepare for client presentation",
        "parameters": {
          "action": "create",
          "taskName": "Prepare presentation slides",
          "dueDate": "Thursday",
          "priority": "high"
        }
      }
    }
  ]
}

Example 3 - No Tools (Information Only):
{
  "message": "Based on your calendar, you have 3 meetings tomorrow: Team standup at 9am, Client call at 2pm, and Project review at 4pm.",
  "reasoning": "User asked for information about their schedule. I'll query their calendar and provide a summary.",
  "tools": []
}

CRITICAL RULES:
1. ALWAYS include the "message" field - never leave it empty
2. Use valid JSON - no trailing commas, proper quotes
3. Be specific in "intent" - this guides tool execution
4. Include ALL relevant context in "parameters"
5. If uncertain about details, mention it in the message and ask for clarification`;
