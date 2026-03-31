export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  createdAt: string;
  messageCount: number;
}

export interface CreateChatResponse {
  success: boolean;
  data: {
    chatId: string;
  };
}

export interface SendMessageResponse {
  success: boolean;
  data: {
    message: ChatMessage;
    chatId: string;
    shouldSummarize: boolean;
  };
}

export interface ChatHistoryResponse {
  success: boolean;
  data: {
    messages: ChatMessage[];
  };
}

export interface ChatSessionsResponse {
  success: boolean;
  data: {
    chats: ChatSession[];
  };
}