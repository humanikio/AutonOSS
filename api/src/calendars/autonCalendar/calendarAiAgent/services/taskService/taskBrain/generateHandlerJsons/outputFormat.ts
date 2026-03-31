/**
 * Output Format for Task Brain Stage 3 - Generate Handler JSONs
 * Defines the JSON structure for handler call generation
 */

export const GENERATE_HANDLER_OUTPUT_FORMAT = `
====================
OUTPUT FORMAT (Stage 3)
====================

You MUST respond with this JSON structure:

{
  "message": "string - REQUIRED - Detailed message explaining what you're doing",
  "reasoning": "string - Explain the parameters you're generating",
  "handlerCalls": [
    {
      "handler": "createTaskHandler | updateTaskHandler | deleteTaskHandler | readTaskHandler | getTasksHandler",
      "parameters": {
        // ALL parameters needed for this handler
        // See detailed specifications for each handler
      }
    }
  ]
}

====================
FIELD DESCRIPTIONS
====================

1. message (REQUIRED):
   - This is the DETAILED execution message
   - Be SPECIFIC about exactly what you're creating/updating/deleting
   - Include task names, times, and key details in the message
   - This is NOT a high-level message - be detailed and actionable
   - Examples:
     * "Creating your task 'Call Jeff' scheduled for today at 6pm..."
     * "Creating 2 tasks: 'Call Roni at 4pm' and 'Review budget by Friday'..."
     * "Updating task 'Project review' to high priority and moving to tomorrow..."

2. reasoning (REQUIRED):
   - Explain the parameters you're generating
   - How you converted dates/times
   - What assumptions you made
   - Why you chose specific values

3. handlerCalls (REQUIRED array):
   - Array of handler call objects
   - Each must have: handler name + parameters object
   - Generate exact number specified in Stage 1 operations
   - Maximum 4 handler calls

====================
HANDLER CALL STRUCTURE
====================

handler:
- Must be one of: createTaskHandler, updateTaskHandler, deleteTaskHandler, readTaskHandler, getTasksHandler
- Use FULL handler name (not abbreviated)

parameters:
- Object with ALL required parameters for that handler
- Include optional parameters when relevant
- Follow handler specifications EXACTLY
- Use proper data types

====================
EXAMPLES
====================

Example 1 - Single Task Creation:
{
  "message": "Creating your task 'Call Jeff' scheduled for today at 6pm to discuss the free website program...",
  "reasoning": "Converting 'today at 6pm' to ISO format using current date. Task name preserved from user request.",
  "handlerCalls": [
    {
      "handler": "createTaskHandler",
      "parameters": {
        "taskName": "Call Jeff about free website program",
        "description": "Discuss free website program details",
        "dueDate": "2025-12-05",
        "dueTime": "2025-12-05T18:00:00Z",
        "priority": "medium"
      }
    }
  ]
}

Example 2 - Multiple Task Creation:
{
  "message": "Creating 2 tasks: 'Call Roni at 4pm' for today and 'Review budget' for Friday...",
  "reasoning": "Creating two separate task handler calls as requested. First task has specific time, second is general date.",
  "handlerCalls": [
    {
      "handler": "createTaskHandler",
      "parameters": {
        "taskName": "Call Roni",
        "dueDate": "2025-12-05",
        "dueTime": "2025-12-05T16:00:00Z",
        "priority": "medium"
      }
    },
    {
      "handler": "createTaskHandler",
      "parameters": {
        "taskName": "Review budget",
        "dueDate": "2025-12-08",
        "priority": "high"
      }
    }
  ]
}

Example 3 - Task Update:
{
  "message": "Updating task 'Dentist appointment' to 3pm today...",
  "reasoning": "Updating dueTime for existing task. Using taskId from Stage 1 analysis.",
  "handlerCalls": [
    {
      "handler": "updateTaskHandler",
      "parameters": {
        "taskId": "task_abc123",
        "dueTime": "2025-12-05T15:00:00Z"
      }
    }
  ]
}

Example 4 - Task with Full Details:
{
  "message": "Creating your high-priority task 'Prepare Q4 presentation' due Friday with checklist items...",
  "reasoning": "Creating comprehensive task with priority, checklist, and estimated duration based on user request.",
  "handlerCalls": [
    {
      "handler": "createTaskHandler",
      "parameters": {
        "taskName": "Prepare Q4 presentation",
        "description": "Create presentation slides for Q4 review meeting",
        "dueDate": "2025-12-08",
        "priority": "high",
        "estimatedDuration": 120,
        "checklistItems": [
          { "id": "1", "text": "Gather Q4 data", "completed": false },
          { "id": "2", "text": "Create slides", "completed": false },
          { "id": "3", "text": "Practice delivery", "completed": false }
        ],
        "tags": ["presentation", "Q4", "work"]
      }
    }
  ]
}

====================
CRITICAL RULES
====================

1. ALWAYS include message, reasoning, and handlerCalls fields
2. message must be DETAILED and SPECIFIC (not high-level)
3. Generate EXACTLY the number of handler calls from Stage 1 operations
4. Use FULL handler names (createTaskHandler, not just "create")
5. ALL dates in ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ
6. Convert relative times using CURRENT DATE & TIME context
7. Task names must be DESCRIPTIVE (no generic names)
8. Include ALL required parameters for each handler
9. Maximum 4 handler calls total
10. Output ONLY valid JSON - no text before or after

====================
DATE/TIME CONVERSION REFERENCE
====================

Current Date & Time: See CURRENT DATE & TIME section above

Conversions:
- "today" → Use current date (2025-12-05)
- "tomorrow" → Add 1 day (2025-12-06)
- "next Monday" → Calculate next Monday date
- "2pm" → "14:00" (24-hour format)
- "3:30pm" → "15:30"
- "noon" → "12:00"
- "midnight" → "00:00"

ISO Format Examples:
- Date only: "2025-12-05"
- Date + Time: "2025-12-05T14:00:00Z"
- Always use 'Z' suffix for UTC timezone
`;
