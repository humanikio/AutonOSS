/**
 * Chat Service
 * Central interface for managing template chats and messages
 */

// Chat CRUD
export { createChat, CreateChatInput, Chat } from './chats/chatCrud/createChat';
export { readChat } from './chats/chatCrud/readChat';
export { deleteChat } from './chats/chatCrud/deleteChat';
export { listChats } from './chats/chatCrud/listChats';

// Message CRUD
export { createMessage, CreateMessageInput, Message, MessageRole } from './chats/messageCrud/createMessage';
export { listMessages } from './chats/messageCrud/listMessages';
