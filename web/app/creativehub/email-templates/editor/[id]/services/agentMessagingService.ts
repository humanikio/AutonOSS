/**
 * Agent Messaging Service
 * Handles communication with the template agent backend
 */

export interface StartCycleRequest {
  tenantId: string;
  templateId: string;
  prompt: string;
  chatId?: string; // Optional chat ID to associate with this cycle
}

export interface StartCycleResponse {
  success: boolean;
  message: string;
  cycle: {
    id: string;
    tenantId: string;
    templateId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    prompt?: string;
  };
  agentResponse?: {
    initialResponse: string;
    tools: Array<{
      tool: 'generateImage' | 'generateHtml' | 'clarification';
      parameters: Record<string, any>;
    }>;
  };
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  metadata?: Record<string, any>;
}

export interface Chat {
  id: string;
  tenantId: string;
  templateId: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messageCount?: number;
}

export interface FetchChatsResponse {
  success: boolean;
  chats: Chat[];
}

export interface CreateChatResponse {
  success: boolean;
  chat: Chat;
}

export interface FetchMessagesResponse {
  success: boolean;
  messages: AgentMessage[];
}

class AgentMessagingService {
  /**
   * Start a new agent cycle with a user prompt
   */
  async startCycle(
    request: StartCycleRequest,
    token: string
  ): Promise<StartCycleResponse> {
    try {
      console.log('\n========================================');
      console.log('[Agent Messaging] Starting new cycle');
      console.log('[Agent Messaging] Request:', {
        tenantId: request.tenantId,
        templateId: request.templateId,
        promptLength: request.prompt.length,
        prompt: request.prompt.substring(0, 100) + '...'
      });
      console.log('[Agent Messaging] Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

      const response = await fetch('/api/template-agent/start-cycle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      console.log('[Agent Messaging] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Agent Messaging] ❌ Error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: StartCycleResponse = await response.json();
      console.log('[Agent Messaging] ✓ Cycle started successfully');
      console.log('[Agent Messaging] Cycle ID:', data.cycle?.id);
      console.log('[Agent Messaging] Agent response:', {
        hasInitialResponse: !!data.agentResponse?.initialResponse,
        initialResponseLength: data.agentResponse?.initialResponse?.length || 0,
        toolsCount: data.agentResponse?.tools?.length || 0,
        tools: data.agentResponse?.tools?.map(t => t.tool) || []
      });
      console.log('========================================\n');

      return data;
    } catch (error) {
      console.error('[Agent Messaging] ❌ Error starting cycle:', error);
      console.error('[Agent Messaging] Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.log('========================================\n');
      throw error;
    }
  }

  /**
   * Create a new user message
   */
  createUserMessage(content: string): AgentMessage {
    return {
      id: this.generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date()
    };
  }

  /**
   * Create a new assistant message
   */
  createAssistantMessage(content: string, isLoading = false): AgentMessage {
    return {
      id: this.generateMessageId(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      isLoading
    };
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Fetch all chats for a template
   */
  async fetchChats(
    tenantId: string,
    templateId: string,
    token: string
  ): Promise<FetchChatsResponse> {
    try {
      console.log('[Agent Messaging] Fetching chats for template:', templateId);

      const response = await fetch(
        `/api/template-agent/chats?tenantId=${tenantId}&templateId=${templateId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: FetchChatsResponse = await response.json();
      console.log('[Agent Messaging] ✓ Fetched chats:', data.chats.length);

      return data;
    } catch (error) {
      console.error('[Agent Messaging] Error fetching chats:', error);
      throw error;
    }
  }

  /**
   * Create a new chat
   */
  async createChat(
    tenantId: string,
    templateId: string,
    token: string,
    name?: string
  ): Promise<CreateChatResponse> {
    try {
      console.log('[Agent Messaging] Creating new chat for template:', templateId);

      const response = await fetch('/api/template-agent/chats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId,
          templateId,
          name
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: CreateChatResponse = await response.json();
      console.log('[Agent Messaging] ✓ Chat created:', data.chat.id);

      return data;
    } catch (error) {
      console.error('[Agent Messaging] Error creating chat:', error);
      throw error;
    }
  }

  /**
   * Fetch messages for a chat
   */
  async fetchMessages(
    tenantId: string,
    templateId: string,
    chatId: string,
    token: string
  ): Promise<FetchMessagesResponse> {
    try {
      console.log('[Agent Messaging] Fetching messages for chat:', chatId);

      const response = await fetch(
        `/api/template-agent/chats/${chatId}/messages?tenantId=${tenantId}&templateId=${templateId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[Agent Messaging] ✓ Fetched messages:', data.messages.length);

      // Convert backend messages to frontend format
      const messages: AgentMessage[] = data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        metadata: msg.metadata
      }));

      return {
        success: true,
        messages
      };
    } catch (error) {
      console.error('[Agent Messaging] Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Add a message to a chat
   */
  async addMessageToChat(
    tenantId: string,
    templateId: string,
    chatId: string,
    role: 'user' | 'assistant',
    content: string,
    token: string,
    metadata?: Record<string, any>
  ): Promise<AgentMessage> {
    try {
      console.log('[Agent Messaging] Adding message to chat:', chatId);

      const response = await fetch(`/api/template-agent/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId,
          templateId,
          role,
          content,
          metadata
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[Agent Messaging] ✓ Message added:', data.message.id);

      return {
        id: data.message.id,
        role: data.message.role,
        content: data.message.content,
        timestamp: new Date(data.message.createdAt),
        metadata: data.message.metadata
      };
    } catch (error) {
      console.error('[Agent Messaging] Error adding message:', error);
      throw error;
    }
  }

  /**
   * Delete a chat
   */
  async deleteChat(
    tenantId: string,
    templateId: string,
    chatId: string,
    token: string
  ): Promise<{ success: boolean }> {
    try {
      console.log('[Agent Messaging] Deleting chat:', chatId);

      const response = await fetch(
        `/api/template-agent/chats/${chatId}?tenantId=${tenantId}&templateId=${templateId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      console.log('[Agent Messaging] ✓ Chat deleted');

      return { success: true };
    } catch (error) {
      console.error('[Agent Messaging] Error deleting chat:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const agentMessagingService = new AgentMessagingService();
