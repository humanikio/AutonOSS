'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ChatMessage, 
  ChatSession, 
  CreateChatResponse, 
  SendMessageResponse, 
  ChatHistoryResponse, 
  ChatSessionsResponse 
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useChatAPI(documentId: string) {
  const { user, getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // Get auth headers
  const getAuthHeaders = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');
    
    const token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [user, getToken]);

  // Create new chat
  const createNewChat = useCallback(async (): Promise<string> => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/kb/chat/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ docId: documentId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create chat error:', response.status, response.statusText, errorText);
        throw new Error(`Failed to create chat: ${response.statusText}`);
      }

      const data: CreateChatResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to create chat session');
      }

      // Refresh chat sessions
      loadChatSessions();
      
      // Clear current messages for new chat
      setMessages([]);
      
      return data.data.chatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }, [documentId, getAuthHeaders]);

  // Send message
  const sendMessage = useCallback(async (chatId: string, message: string) => {
    try {
      setIsLoading(true);
      
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, userMessage]);

      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/kb/chat/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          docId: documentId,
          chatId,
          message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', response.status, response.statusText, errorText);
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data: SendMessageResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to send message');
      }

      // Replace temp user message and add assistant response
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg.id !== userMessage.id);
        return [
          ...filteredMessages,
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
          },
          data.data.message
        ];
      });

      // Refresh chat sessions to update message count
      loadChatSessions();
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp user message on error
      setMessages(prev => prev.filter(msg => msg.id !== `temp-${Date.now()}`));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [documentId, getAuthHeaders]);

  // Get current chat (most recent or create new)
  const getCurrentChat = useCallback(async (): Promise<{ chatId: string; messages: ChatMessage[]; isNewChat: boolean }> => {
    try {
      setIsLoading(true);
      
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/kb/chat/${documentId}/current`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Get current chat error:', response.status, response.statusText, errorText);
        throw new Error(`Failed to get current chat: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to get current chat');
      }

      // Set the messages from the current chat
      setMessages(data.data.messages || []);
      
      return {
        chatId: data.data.chatId,
        messages: data.data.messages || [],
        isNewChat: data.data.isNewChat || false
      };
      
    } catch (error) {
      console.error('Error getting current chat:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [documentId, getAuthHeaders]);

  // Load chat history
  const loadChatHistory = useCallback(async (chatId: string) => {
    try {
      setIsLoading(true);
      
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/kb/chat/${documentId}/${chatId}/history`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Load chat history error:', response.status, response.statusText, errorText);
        throw new Error(`Failed to load chat history: ${response.statusText}`);
      }

      const data: ChatHistoryResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to load chat history');
      }

      setMessages(data.data.messages);
      
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [documentId, getAuthHeaders]);

  // Load chat sessions
  const loadChatSessions = useCallback(async () => {
    try {
      setIsLoadingChats(true);
      
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/kb/chat/${documentId}/sessions`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Load chat sessions error:', response.status, response.statusText, errorText);
        throw new Error(`Failed to load chat sessions: ${response.statusText}`);
      }

      const data: ChatSessionsResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to load chat sessions');
      }

      setChatSessions(data.data.chats);
      
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      setChatSessions([]);
    } finally {
      setIsLoadingChats(false);
    }
  }, [documentId, getAuthHeaders]);

  // Delete chat
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/kb/chat/${documentId}/${chatId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to delete chat: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to delete chat');
      }

      // Remove from local state
      setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
      
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }, [documentId, getAuthHeaders]);

  // Get quick suggestions
  const getQuickSuggestions = useCallback(async (): Promise<string[]> => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/kb/chat/${documentId}/suggestions`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to get suggestions');
      }

      return data.data.suggestions;
      
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [
        "How can I improve this document?",
        "What should I add next?",
        "Help me organize this content"
      ];
    }
  }, [documentId, getAuthHeaders]);

  return {
    messages,
    chatSessions,
    isLoading,
    isLoadingChats,
    createNewChat,
    sendMessage,
    loadChatHistory,
    loadChatSessions,
    deleteChat,
    getQuickSuggestions,
    getCurrentChat,
  };
}