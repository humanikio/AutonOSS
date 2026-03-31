/**
 * Shared types for event handlers
 */

export interface ToolExecutionContext {
  tenantId: string;
  chatId?: string;
  calendarId?: string;
}

export interface HandlerResult {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}
