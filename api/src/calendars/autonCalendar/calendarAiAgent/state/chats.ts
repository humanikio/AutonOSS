/**
 * Chat State Module
 * Main entry point for all chat state management
 * Re-exports all chat services and utilities for easy consumption
 */

// Re-export all chat services
export {
  createChat,
  getCurrentChat,
  changeCurrentChat,
  listChats,
  updateChat,
  deleteChat,
  createMessage,
  getChatMessages,
  type Chat,
  type CreateChatInput,
  type UpdateChatInput,
  type Message,
  type MessageRole,
  type CreateMessageInput
} from './chats/index';

// Re-export state utilities
export {
  getCurrentState,
  updateState,
  initializeState,
  type AIAgentState
} from './utils/getCurrentState';
