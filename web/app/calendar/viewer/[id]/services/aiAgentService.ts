import apiClient from '@/lib/api/client';

/**
 * AI Agent Service
 * Handles all API interactions for the calendar AI agent
 */

export interface Message {
  messageId: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  calendarId?: string;
  eventId?: string;
  taskId?: string;
  cycleId?: string;
  toolCalls?: any[];
  metadata?: Record<string, any>;
}

export interface Chat {
  chatId: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  metadata?: Record<string, any>;
}

export interface Cycle {
  cycleId: string;
  tenantId: string;
  chatId: string | null;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SendMessageRequest {
  prompt: string;
  chatId?: string;
  calendarId?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  chatId: string;
  cycleId: string | null;
  error?: string;
}

export interface CreateChatRequest {
  name?: string;
  metadata?: Record<string, any>;
}

export class AIAgentService {
  private calendarId: string;

  constructor(calendarId: string) {
    this.calendarId = calendarId;
  }

  /**
   * Send a message to the AI agent
   */
  async sendMessage(prompt: string, chatId?: string): Promise<SendMessageResponse> {
    try {
      const response = await apiClient.post('/api/calendar-agent/send-message', {
        prompt,
        chatId,
        calendarId: this.calendarId
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get the current active chat
   */
  async getCurrentChat(): Promise<Chat | null> {
    try {
      const response = await apiClient.get('/api/calendar-agent/chat/current');
      return response.data.chat;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error getting current chat:', error);
      throw error;
    }
  }

  /**
   * List all chats
   */
  async listChats(): Promise<Chat[]> {
    try {
      const response = await apiClient.get('/api/calendar-agent/chats');
      return response.data.chats || [];
    } catch (error) {
      console.error('Error listing chats:', error);
      throw error;
    }
  }

  /**
   * Create a new chat
   */
  async createChat(data?: CreateChatRequest): Promise<Chat> {
    try {
      const response = await apiClient.post('/api/calendar-agent/chats', data);
      return response.data.chat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  /**
   * Change the current active chat
   */
  async changeCurrentChat(chatId: string): Promise<void> {
    try {
      await apiClient.post('/api/calendar-agent/chat/current', { chatId });
    } catch (error) {
      console.error('Error changing current chat:', error);
      throw error;
    }
  }

  /**
   * Get messages for a specific chat
   */
  async getChatMessages(chatId: string, limit?: number): Promise<Message[]> {
    try {
      const params = limit ? { limit } : {};
      const response = await apiClient.get(`/api/calendar-agent/chats/${chatId}/messages`, { params });
      return response.data.messages || [];
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw error;
    }
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/calendar-agent/chats/${chatId}`);
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  /**
   * Get the current cycle
   */
  async getCurrentCycle(): Promise<Cycle | null> {
    try {
      const response = await apiClient.get('/api/calendar-agent/cycle/current');
      return response.data.cycle;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error getting current cycle:', error);
      throw error;
    }
  }

  /**
   * List all cycles
   */
  async listCycles(limit?: number): Promise<Cycle[]> {
    try {
      const params = limit ? { limit } : {};
      const response = await apiClient.get('/api/calendar-agent/cycles', { params });
      return response.data.cycles || [];
    } catch (error) {
      console.error('Error listing cycles:', error);
      throw error;
    }
  }
}
