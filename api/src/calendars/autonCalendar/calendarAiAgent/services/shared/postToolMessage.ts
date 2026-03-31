/**
 * Post Tool Message Utility
 * Shared utility for posting special tool-related messages to chat
 * Used by handlers, brain operations, and tools to show real-time progress
 */

import { createMessage } from '../../state/chats/createMessage';

export type ToolType = 'task' | 'event' | 'calendar' | 'context' | 'search';
export type ToolAction = 'create' | 'update' | 'delete' | 'read' | 'search' | 'fetch' | 'find';
export type ToolStatus = 'pending' | 'success' | 'error';

export interface ToolMessageOptions {
  // Required
  tenantId: string;
  chatId?: string;
  calendarId?: string;

  // Tool metadata
  toolType: ToolType;
  action: ToolAction;
  status: ToolStatus;

  // Message content
  message: string;

  // Optional data
  entityId?: string;        // ID of created/updated/deleted entity
  entityType?: string;      // Type of entity (task, event, etc.)
  count?: number;           // For list operations (e.g., "Found 5 tasks")
  data?: any;               // Additional data
  error?: string;           // Error message if status is 'error'
}

/**
 * Post a tool message to chat with special metadata
 * Frontend can detect these messages and render them specially
 *
 * @param options - Tool message options
 * @returns Message ID
 *
 * @example
 * // Pending message
 * await postToolMessage({
 *   tenantId,
 *   chatId,
 *   calendarId,
 *   toolType: 'task',
 *   action: 'create',
 *   status: 'pending',
 *   message: 'Creating task "Call Jeff"...'
 * });
 *
 * // Success message
 * await postToolMessage({
 *   tenantId,
 *   chatId,
 *   calendarId,
 *   toolType: 'task',
 *   action: 'create',
 *   status: 'success',
 *   message: 'Created task "Call Jeff"!',
 *   entityId: 'task_abc123'
 * });
 *
 * // Error message
 * await postToolMessage({
 *   tenantId,
 *   chatId,
 *   calendarId,
 *   toolType: 'task',
 *   action: 'create',
 *   status: 'error',
 *   message: 'Failed to create task',
 *   error: 'Invalid due date format'
 * });
 */
export async function postToolMessage(options: ToolMessageOptions): Promise<string> {
  const {
    tenantId,
    chatId,
    calendarId,
    toolType,
    action,
    status,
    message,
    entityId,
    entityType,
    count,
    data,
    error
  } = options;

  // Create message with special metadata
  const createdMessage = await createMessage(tenantId, {
    role: 'assistant',
    content: message,
    calendarId,
    metadata: {
      // Mark as tool message
      toolMessage: true,

      // Tool info
      toolType,
      action,
      status,

      // Optional data
      ...(entityId && { entityId }),
      ...(entityType && { entityType }),
      ...(count !== undefined && { count }),
      ...(data && { data }),
      ...(error && { error }),

      // Timestamp
      timestamp: new Date().toISOString()
    }
  });

  return createdMessage.messageId;
}

/**
 * Post a pending tool message
 * Convenience wrapper for pending status
 *
 * @example
 * await postPendingToolMessage({
 *   tenantId,
 *   chatId,
 *   calendarId,
 *   toolType: 'task',
 *   action: 'create',
 *   message: 'Creating task...'
 * });
 */
export async function postPendingToolMessage(
  options: Omit<ToolMessageOptions, 'status'>
): Promise<string> {
  return postToolMessage({ ...options, status: 'pending' });
}

/**
 * Post a success tool message
 * Convenience wrapper for success status
 *
 * @example
 * await postSuccessToolMessage({
 *   tenantId,
 *   chatId,
 *   calendarId,
 *   toolType: 'task',
 *   action: 'create',
 *   message: 'Created task!',
 *   entityId: 'task_123'
 * });
 */
export async function postSuccessToolMessage(
  options: Omit<ToolMessageOptions, 'status'>
): Promise<string> {
  return postToolMessage({ ...options, status: 'success' });
}

/**
 * Post an error tool message
 * Convenience wrapper for error status
 *
 * @example
 * await postErrorToolMessage({
 *   tenantId,
 *   chatId,
 *   calendarId,
 *   toolType: 'task',
 *   action: 'create',
 *   message: 'Failed to create task',
 *   error: 'Invalid due date'
 * });
 */
export async function postErrorToolMessage(
  options: Omit<ToolMessageOptions, 'status'>
): Promise<string> {
  return postToolMessage({ ...options, status: 'error' });
}
