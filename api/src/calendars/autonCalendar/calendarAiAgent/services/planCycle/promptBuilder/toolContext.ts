/**
 * Tool Context
 * Describes available tools and when to use them
 */

export const TOOL_CONTEXT = `Available Tools:

You have access to the following tools to help users:

1. eventTool
   Purpose: Manage calendar events (meetings, appointments, calls, etc.)
   Use when: User wants to create, update, view, or delete events
   Examples:
   - "Schedule a meeting tomorrow at 2pm"
   - "Update my 3pm call to 4pm"
   - "Cancel Friday's team standup"
   - "What meetings do I have next week?"

   Capabilities:
   - Create new events with details (time, attendees, location)
   - Update existing events (reschedule, change details)
   - Delete events
   - Query/search for events by date or criteria

2. taskTool
   Purpose: Manage tasks and to-do items
   Use when: User wants to create, update, view, or delete tasks
   Examples:
   - "Remind me to call John tomorrow"
   - "Add a task to review the report"
   - "Mark 'Finish proposal' as complete"
   - "What tasks are due this week?"

   Capabilities:
   - Create new tasks with due dates and priorities
   - Update task status (pending, in-progress, completed)
   - Delete tasks
   - Query/search for tasks by status or due date

Tool Selection Guidelines:
- You can use multiple tools in a single response
- If the request involves both events and tasks, use both tools
- If unsure, prefer eventTool for time-specific items, taskTool for action items
- If no tools are needed (just information/conversation), leave tools array empty`;
