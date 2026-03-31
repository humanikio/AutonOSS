/**
 * Task Handler Context - Basic Descriptions
 * Used in Stage 1 (reviewPrompt) to determine which operations are needed
 * Does NOT include detailed field specifications - those are loaded later
 */

export const HANDLER_DESCRIPTIONS = `
Available Task Handlers:

1. createTaskHandler
   - Purpose: Create new calendar tasks
   - When to use: User wants to add tasks to their calendar
   - Can batch: Yes (can create multiple tasks in sequence)
   - Requires: Task name at minimum
   - Example: "Create task to review budget"

2. updateTaskHandler
   - Purpose: Update existing task details
   - When to use: User wants to modify task properties (name, date, priority, status, etc.)
   - Requires: taskId (must know which task to update)
   - Can batch: Yes (can update multiple tasks)
   - Example: "Mark task as completed", "Change task priority to high"

3. deleteTaskHandler
   - Purpose: Delete tasks from calendar
   - When to use: User wants to remove tasks
   - Requires: taskId (must know which task to delete)
   - Can batch: Yes (can delete multiple tasks)
   - Example: "Delete the budget review task"

4. readTaskHandler
   - Purpose: Retrieve details of a single task
   - When to use: User asks about a specific task's details
   - Requires: taskId
   - Returns: Full task information
   - Example: "Show me details of the budget task"

5. getTasksHandler
   - Purpose: List all tasks for the calendar
   - When to use: User wants overview, list, or to browse tasks
   - Requires: Nothing (gets all tasks)
   - Returns: Array of all tasks
   - Example: "What are my tasks?", "Show me all tasks"

Notes:
- Operations can be combined (e.g., create 2 tasks, then update 1 existing task)
- Maximum 4 operations per request for performance
- If user mentions specific task names/descriptions, they likely want createTaskHandler
- If user says "my tasks", "the budget task", etc., they likely need readTaskHandler or getTasksHandler first
`;

/**
 * Type definition for handler operations
 */
export type HandlerType = 'create' | 'update' | 'delete' | 'read' | 'getTasks';

/**
 * Maps handler types to their full handler names
 */
export const HANDLER_NAME_MAP: Record<HandlerType, string> = {
  create: 'createTaskHandler',
  update: 'updateTaskHandler',
  delete: 'deleteTaskHandler',
  read: 'readTaskHandler',
  getTasks: 'getTasksHandler'
};
