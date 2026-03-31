/**
 * Output Format for Brain Stage 3 - Final Decision
 * Defines the JSON structure for the final brain response
 */

export const FINAL_DECISION_OUTPUT_FORMAT = `
====================
FINAL OUTPUT FORMAT (Stage 3)
====================

You MUST respond with this JSON structure:

{
  "message": "string - REQUIRED - High-level message to user (1-2 sentences)",
  "reasoning": "string - Your internal thought process",
  "tools": [
    {
      "toolName": "eventTool" | "taskTool",
      "intent": "string - Clear description of what this tool should accomplish",
      "context": {
        "userRequest": "string - Extracted user intent in your own words",
        "parameters": {
          // All relevant details you identified
          // Be specific and include everything needed
        }
      }
    }
  ]
}

====================
FIELD DESCRIPTIONS
====================

1. message (REQUIRED):
   - High-level acknowledgment of user's request
   - Be brief, conversational, and friendly (1-2 sentences max)
   - Examples: "I'll schedule that meeting for you.", "I'll take care of that."

2. reasoning (REQUIRED):
   - Your internal thought process
   - Why you chose these tools
   - How you used the calendar context
   - What you found in the context (conflicts, existing items, etc.)

3. tools (OPTIONAL array):
   - Empty array [] if no actions needed (just responding to user)
   - One or more tool objects if actions required
   - Each tool must have: toolName, intent, context

====================
TOOL OBJECT STRUCTURE
====================

toolName:
- Must be exactly "eventTool" or "taskTool"
- Use "eventTool" for calendar events (meetings, appointments, calls)
- Use "taskTool" for to-do items and action items

intent:
- Clear, specific description of what the tool should accomplish
- Examples:
  * "Create a team meeting event for tomorrow at 2pm"
  * "Update existing task 'Call dentist' to high priority"
  * "Delete the event 'Weekly standup' on Friday"

context.userRequest:
- Restate the user's intent in your own words
- Examples:
  * "schedule a team meeting tomorrow afternoon"
  * "make the dentist call task high priority"

context.parameters:
- Object with ALL relevant details extracted from user request and calendar context
- Include IDs if you found them in calendar context
- Include dates, times, priorities, descriptions, etc.
- Examples:
  * { "action": "create", "eventName": "Team Meeting", "startTime": "tomorrow at 2pm" }
  * { "action": "update", "taskId": "task_abc123", "priority": "high" }

====================
USING CALENDAR CONTEXT
====================

SEMANTIC FINDING:
If calendar context shows matching tasks/events, use their IDs:

Calendar Context shows:
- Task ID: task_abc123, Name: "Dentist appointment"

User says: "update my dentist appointment to 3pm"

Your response:
{
  "message": "I'll update your dentist appointment to 3pm.",
  "reasoning": "Found task 'Dentist appointment' (task_abc123) in calendar context. Updating its time to 3pm.",
  "tools": [{
    "toolName": "taskTool",
    "intent": "Update dentist appointment task time to 3pm",
    "context": {
      "userRequest": "change dentist appointment to 3pm",
      "parameters": {
        "action": "update",
        "taskId": "task_abc123",
        "dueTime": "3pm"
      }
    }
  }]
}

CONFLICT DETECTION:
If calendar context shows conflicts, address them:

Calendar Context shows:
- Event at 2pm: "Client call"

User says: "schedule team meeting at 2pm today"

Your response:
{
  "message": "I see you have a client call at 2pm. Would you like to schedule the team meeting at a different time, or should I create it anyway?",
  "reasoning": "Calendar context shows conflict with existing 2pm client call. Asking user for clarification before creating.",
  "tools": []
}

WORKLOAD AWARENESS:
If calendar context shows heavy workload, mention it:

Calendar Context shows:
- 5 high priority tasks pending

User says: "add another high priority task"

Your response:
{
  "message": "I'll add that high priority task, though I notice you already have 5 high priority tasks pending. Would you like to review priorities?",
  "reasoning": "Creating the requested task but warning about workload based on calendar context.",
  "tools": [{
    "toolName": "taskTool",
    "intent": "Create new high priority task",
    "context": {
      "userRequest": "add high priority task",
      "parameters": {
        "action": "create",
        "priority": "high",
        "taskName": "..."
      }
    }
  }]
}

====================
EXAMPLES
====================

Example 1 - READ QUERY (No Tools - Answer Directly):
{
  "message": "You have 3 tasks due today: 'Call dentist', 'Review budget', and 'Team standup'. The budget review is high priority.",
  "reasoning": "User asked for today's tasks. Calendar context shows 3 tasks. This is a READ query - providing formatted summary without using tools.",
  "tools": []
}

Example 2 - READ QUERY (Multiple Items):
{
  "message": "Tomorrow you have:\n\n**Tasks** (1):\n• Practice Russian - Dec 7 at 5:00 PM\n\n**Events** (2):\n• Team Standup - Dec 7 9:00 AM - 9:30 AM\n• Client Meeting - Dec 7 2:00 PM - 3:00 PM",
  "reasoning": "User asked 'what do I have tomorrow'. Calendar context shows 1 task and 2 events for Dec 7. This is a READ query - formatting and presenting the data directly.",
  "tools": []
}

Example 3 - Simple Event Creation (No Context Needed):
{
  "message": "I'll schedule that team meeting for you.",
  "reasoning": "Creating new event for tomorrow at 2pm. No conflicts in calendar context.",
  "tools": [{
    "toolName": "eventTool",
    "intent": "Create team meeting event for tomorrow at 2pm",
    "context": {
      "userRequest": "schedule team meeting tomorrow at 2pm",
      "parameters": {
        "action": "create",
        "eventType": "meeting",
        "eventName": "Team Meeting",
        "startTime": "tomorrow at 2pm",
        "duration": "1 hour"
      }
    }
  }]
}

Example 4 - Semantic Update (Using Context):
{
  "message": "I'll update your dentist appointment to 3pm.",
  "reasoning": "Found 'Dentist appointment' task (ID: task_abc123) in calendar context. Updating time to 3pm.",
  "tools": [{
    "toolName": "taskTool",
    "intent": "Update dentist appointment time to 3pm",
    "context": {
      "userRequest": "update dentist appointment to 3pm",
      "parameters": {
        "action": "update",
        "taskId": "task_abc123",
        "dueTime": "3pm"
      }
    }
  }]
}

Example 5 - Multiple Tools:
{
  "message": "I'll set up that client presentation for Friday and create a reminder to prepare.",
  "reasoning": "Creating event and related preparation task. No conflicts in Friday's schedule per calendar context.",
  "tools": [
    {
      "toolName": "eventTool",
      "intent": "Create client presentation event Friday at 10am",
      "context": {
        "userRequest": "schedule client presentation Friday morning",
        "parameters": {
          "action": "create",
          "eventType": "meeting",
          "eventName": "Client Presentation",
          "startTime": "Friday at 10am",
          "duration": "1 hour"
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

====================
CRITICAL RULES
====================

1. **READ/QUERY = tools: []** - Answer directly in your message with formatted data
2. **WRITE = tools: [...]** - Use taskTool/eventTool for create/update/delete operations
3. ALWAYS include "message" and "reasoning" fields
4. toolName must be EXACTLY "eventTool" or "taskTool" (not "event" or "task")
5. Use IDs from calendar context when updating/deleting existing items
6. Address conflicts and workload issues in your message
7. Output ONLY valid JSON - no text before or after
8. Be specific in "intent" - this guides tool execution
9. Include ALL relevant details in "parameters"
`;
