/**
 * useChimeraChat Hook
 *
 * Manages chat state and API calls to chimera-api.
 * Handles chat creation, message fetching, and real-time updates.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// TYPES
// ============================================

export interface ChimeraChat {
  chatId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChimeraMessage {
  messageId: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface UseChimeraChatReturn {
  // State
  chats: ChimeraChat[];
  currentChatId: string | null;
  messages: ChimeraMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  // Actions
  createChat: (title?: string) => Promise<string | null>;
  getChats: () => Promise<void>;
  getCurrentChat: () => Promise<string | null>;
  getChatMessages: (chatId: string) => Promise<void>;
  sendMessage: (content: string, role?: 'user' | 'agent') => Promise<string | null>;
  deleteChat: (chatId: string) => Promise<boolean>;
  setCurrentChatId: (chatId: string | null) => void;
  clearError: () => void;
}

// ============================================
// API BASE URL
// ============================================

const CHIMERA_API_URL = process.env.NEXT_PUBLIC_CHIMERA_API_URL || 'http://localhost:3001';

// ============================================
// HOOK
// ============================================

export function useChimeraChat(): UseChimeraChatReturn {
  const { user, getToken } = useAuth();

  // State
  const [chats, setChats] = useState<ChimeraChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChimeraMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper: Make authenticated request
  const apiRequest = useCallback(
    async <T>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      try {
        const token = await getToken();

        if (!token) {
          return { success: false, error: 'Not authenticated' };
        }

        const response = await fetch(`${CHIMERA_API_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.error || `Request failed: ${response.status}`,
          };
        }

        return { success: true, data: data.data };
      } catch (err) {
        console.error('[useChimeraChat] API request error:', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Request failed',
        };
      }
    },
    [getToken]
  );

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Create a new chat
   */
  const createChat = useCallback(
    async (title?: string): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      const result = await apiRequest<{ chatId: string }>('/api/v1/chats', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });

      setIsLoading(false);

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to create chat');
        return null;
      }

      console.log('[useChimeraChat] createChat response:', result.data);
      const newChatId = result.data.chatId;

      if (!newChatId) {
        console.error('[useChimeraChat] No chatId in response:', result.data);
        setError('Invalid response: no chatId');
        return null;
      }

      // Add to local state
      const newChat: ChimeraChat = {
        chatId: newChatId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChatId);

      return newChatId;
    },
    [apiRequest]
  );

  /**
   * Get all chats
   */
  const getChats = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const result = await apiRequest<{ chats: ChimeraChat[] }>('/api/v1/chats');

    setIsLoading(false);

    if (!result.success || !result.data) {
      setError(result.error || 'Failed to get chats');
      return;
    }

    setChats(result.data.chats || []);
  }, [apiRequest]);

  /**
   * Get current active chat
   */
  const getCurrentChat = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    const result = await apiRequest<{ currentChatId: string }>(
      '/api/v1/chats/current/active'
    );

    setIsLoading(false);

    if (!result.success || !result.data) {
      // Not an error - might just not have a current chat
      return null;
    }

    const chatId = result.data.currentChatId;
    setCurrentChatId(chatId);

    return chatId;
  }, [apiRequest]);

  /**
   * Get messages for a specific chat
   */
  const getChatMessages = useCallback(
    async (chatId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      const result = await apiRequest<{ messages: ChimeraMessage[] }>(
        `/api/v1/chats/${chatId}/messages`
      );

      setIsLoading(false);

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to get messages');
        return;
      }

      setMessages(result.data.messages || []);
    },
    [apiRequest]
  );

  /**
   * Send a message to the current chat
   */
  const sendMessage = useCallback(
    async (content: string, role: 'user' | 'agent' = 'user'): Promise<string | null> => {
      if (!currentChatId) {
        setError('No chat selected');
        return null;
      }

      setIsSending(true);
      setError(null);

      // Optimistically add message to UI
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: ChimeraMessage = {
        messageId: tempId,
        chatId: currentChatId,
        role: role === 'agent' ? 'assistant' : role,
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      const result = await apiRequest<{ messageId: string }>(
        `/api/v1/chats/${currentChatId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content, role }),
        }
      );

      setIsSending(false);

      if (!result.success || !result.data) {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.messageId !== tempId));
        setError(result.error || 'Failed to send message');
        return null;
      }

      // Update optimistic message with real ID
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === tempId ? { ...m, messageId: result.data!.messageId } : m
        )
      );

      return result.data.messageId;
    },
    [apiRequest, currentChatId]
  );

  /**
   * Delete a chat
   */
  const deleteChat = useCallback(
    async (chatId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      const result = await apiRequest(`/api/v1/chats/${chatId}`, {
        method: 'DELETE',
      });

      setIsLoading(false);

      if (!result.success) {
        setError(result.error || 'Failed to delete chat');
        return false;
      }

      // Remove from local state
      setChats((prev) => prev.filter((c) => c.chatId !== chatId));

      // Clear current if deleted
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }

      return true;
    },
    [apiRequest, currentChatId]
  );

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Load chats when user is authenticated
  useEffect(() => {
    if (user) {
      getChats();
      getCurrentChat();
    }
  }, [user, getChats, getCurrentChat]);

  // Load messages when current chat changes
  useEffect(() => {
    if (currentChatId) {
      getChatMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId, getChatMessages]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    chats,
    currentChatId,
    messages,
    isLoading,
    isSending,
    error,

    // Actions
    createChat,
    getChats,
    getCurrentChat,
    getChatMessages,
    sendMessage,
    deleteChat,
    setCurrentChatId,
    clearError,
  };
}

export default useChimeraChat;
