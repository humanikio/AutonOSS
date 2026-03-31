import { claudeService } from './callClaude';
import { aiResponseHandler } from './handleAiResponse';
import { chatManager, ChatMessage } from './memory/chatManager';
import { chatSummarizer } from './memory/chatSummarizer';
import { promptBuilder } from './memory/promptBuilder';

export interface ChatResponse {
  message: ChatMessage;
  chatId: string;
  shouldSummarize: boolean;
  documentUpdated?: boolean;
  toolsExecuted?: string[];
}

export interface CreateChatRequest {
  tenantId: string;
  docId: string;
}

export interface SendMessageRequest {
  tenantId: string;
  docId: string;
  chatId: string;
  message: string;
}

export class ChatAgent {
  
  constructor() {
    // Services are imported as singletons
  }

  /**
   * Create a new chat session
   */
  async createChat(request: CreateChatRequest): Promise<{ chatId: string }> {
    try {
      const chatId = await chatManager.createChatSession(request.tenantId, request.docId);
      
      console.log(`Created new chat session ${chatId} for document ${request.docId}`);
      
      return { chatId };

    } catch (error) {
      console.error('Error creating chat:', error);
      throw new Error('Failed to create chat session');
    }
  }

  /**
   * Send a message and get AI response with tool support
   */
  async sendMessage(request: SendMessageRequest): Promise<ChatResponse> {
    try {
      // Save user message first
      const userMessage = await chatManager.addMessage(
        request.tenantId,
        request.docId,
        request.chatId,
        'user',
        request.message
      );

      // Call Claude with enhanced prompt (includes tool instructions)
      const claudeResponse = await claudeService.callClaude({
        tenantId: request.tenantId,
        docId: request.docId,
        chatId: request.chatId,
        userMessage: request.message
      });

      // Handle AI response and execute any tools
      const processedResponse = await aiResponseHandler.handleAiResponse(
        claudeResponse,
        request.tenantId,
        request.docId
      );

      // Prepare final chat response
      let finalResponse = processedResponse.chatResponse;
      if (processedResponse.documentUpdated) {
        finalResponse += '\n\n*I have updated the document with the new information.*';
      }

      // Save AI response to chat
      const assistantMessage = await chatManager.addMessage(
        request.tenantId,
        request.docId,
        request.chatId,
        'assistant',
        finalResponse
      );

      // Check if we need to summarize
      const chatSession = await chatManager.loadChatHistory(
        request.tenantId,
        request.docId,
        request.chatId
      );

      const shouldSummarize = chatSession 
        ? chatSummarizer.shouldSummarize(chatSession.messageCount)
        : false;

      // Trigger summarization if needed
      if (shouldSummarize && chatSession) {
        await this.summarizeChat(request.tenantId, request.docId, request.chatId, chatSession.messages);
      }

      return {
        message: assistantMessage,
        chatId: request.chatId,
        shouldSummarize,
        documentUpdated: processedResponse.documentUpdated,
        toolsExecuted: processedResponse.toolExecuted ? ['aiDocEdit'] : []
      };

    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to process message');
    }
  }

  /**
   * Load chat history
   */
  async loadChatHistory(
    tenantId: string,
    docId: string,
    chatId: string
  ): Promise<ChatMessage[]> {
    try {
      const chatSession = await chatManager.loadChatHistory(tenantId, docId, chatId);
      
      if (!chatSession) {
        return [];
      }

      return chatSession.messages;

    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }

  /**
   * List all chat sessions for a document
   */
  async listChats(
    tenantId: string,
    docId: string
  ): Promise<Array<{id: string; createdAt: string; messageCount: number}>> {
    try {
      return await chatManager.listChatSessions(tenantId, docId);

    } catch (error) {
      console.error('Error listing chats:', error);
      return [];
    }
  }

  /**
   * Delete a chat session
   */
  async deleteChat(
    tenantId: string,
    docId: string,
    chatId: string
  ): Promise<void> {
    try {
      await chatManager.deleteChatSession(tenantId, docId, chatId);
      console.log(`Deleted chat session ${chatId}`);

    } catch (error) {
      console.error('Error deleting chat:', error);
      throw new Error('Failed to delete chat');
    }
  }

  /**
   * Summarize a chat conversation
   */
  private async summarizeChat(
    tenantId: string,
    docId: string,
    chatId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    try {
      // Get messages to summarize (exclude recent ones)
      const messagesToSummarize = messages.slice(0, -10); // Keep last 10 messages
      
      if (messagesToSummarize.length === 0) {
        return;
      }

      // Generate summary
      const summary = await chatSummarizer.summarizeConversation(messagesToSummarize);

      // Update chat with summary
      await chatManager.updateChatSummary(tenantId, docId, chatId, summary);

      // Prune old messages
      await chatManager.pruneOldMessages(tenantId, docId, chatId, 20);

      console.log(`Summarized and pruned chat ${chatId}`);

    } catch (error) {
      console.error('Error summarizing chat:', error);
      // Don't throw error - summarization failure shouldn't break the chat
    }
  }

  /**
   * Get quick suggestions for the user
   */
  async getQuickSuggestions(
    tenantId: string,
    docId: string
  ): Promise<string[]> {
    try {
      // Load document context to provide relevant suggestions
      const documentContext = await promptBuilder.getDocumentContext(tenantId, docId);
      
      const suggestions = [
        "Help me improve this document's structure",
        "What sections should I add?",
        "Review this content for clarity",
        "Suggest better formatting",
        "What best practices should I follow?"
      ];

      // Could enhance this with document-specific suggestions based on type/content
      return suggestions;

    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [
        "How can I improve this document?",
        "What should I add next?",
        "Help me organize this content"
      ];
    }
  }
}

export const chatAgent = new ChatAgent();