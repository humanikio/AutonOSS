'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/contexts/AuthContext';
import {
  agentMessagingService,
  AgentMessage,
  Chat
} from '../services/agentMessagingService';
import { db } from '@/lib/firebase/firebase';
import { doc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface ChatInterfaceProps {
  templateId: string;
  initialPrompt?: string;
  onHtmlGenerated?: (html: string) => void;
}

export default function ChatInterface({
  templateId,
  initialPrompt = '',
  onHtmlGenerated
}: ChatInterfaceProps) {
  const { currentTenantId, getToken } = useAuth();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputValue, setInputValue] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [cycleActivity, setCycleActivity] = useState<string | null>(null);
  const [cycleActivityLabel, setCycleActivityLabel] = useState<string | null>(null);
  const [currentCycleId, setCurrentCycleId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load all chats on mount
  useEffect(() => {
    if (currentTenantId && templateId) {
      loadChats();
    }
  }, [currentTenantId, templateId]);

  // Auto-scroll to bottom when messages change, loading state changes, or activity label updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, cycleActivityLabel]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Real-time listener for chat messages
  useEffect(() => {
    if (!currentTenantId || !templateId || !currentChat?.id) return;

    console.log('[Chat Interface] Setting up messages listener for chat:', currentChat.id);

    const messagesRef = collection(
      db,
      'tenants', currentTenantId,
      'emailTemplates', templateId,
      'chats', currentChat.id,
      'messages'
    );

    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          role: data.role as 'user' | 'assistant',
          content: data.content || '',
          timestamp: data.createdAt?.toDate() || new Date(),
          isLoading: false,
          metadata: data.metadata
        };
      });
      console.log('[Chat Interface] Messages updated:', msgs.length);
      setMessages(msgs);
    });

    return () => {
      console.log('[Chat Interface] Cleaning up messages listener');
      unsubscribe();
    };
  }, [currentChat?.id, currentTenantId, templateId]);

  // Real-time listener for cycle status
  useEffect(() => {
    if (!currentTenantId || !templateId || !currentCycleId) return;

    console.log('[Chat Interface] Setting up cycle listener for cycle:', currentCycleId);

    const cycleRef = doc(
      db,
      'tenants', currentTenantId,
      'emailTemplates', templateId,
      'agentCycles', currentCycleId
    );

    const unsubscribe = onSnapshot(cycleRef, (snapshot) => {
      const data = snapshot.data();
      if (data) {
        setCycleActivity(data.currentActivity || null);
        setCycleActivityLabel(data.currentActivityLabel || null);
        setIsLoading(data.status === 'active' && data.currentActivity !== null);
        console.log('[Chat Interface] Cycle updated:', {
          status: data.status,
          activity: data.currentActivity,
          label: data.currentActivityLabel
        });
      }
    });

    return () => {
      console.log('[Chat Interface] Cleaning up cycle listener');
      unsubscribe();
    };
  }, [currentCycleId, currentTenantId, templateId]);

  /**
   * Load all chats for this template
   */
  const loadChats = async () => {
    if (!currentTenantId) return;

    setIsLoadingChats(true);
    try {
      const token = await getToken();
      console.log('[Chat Interface] Loading chats...');

      const chatsResponse = await agentMessagingService.fetchChats(
        currentTenantId!,
        templateId,
        token!
      );

      setAllChats(chatsResponse.chats);

      if (chatsResponse.chats.length > 0) {
        // Select the most recent chat
        setCurrentChat(chatsResponse.chats[0]);
        console.log('[Chat Interface] Selected chat:', chatsResponse.chats[0].id);
      } else {
        // No chats exist - auto-create the first one
        console.log('[Chat Interface] No chats found - auto-creating first chat...');

        try {
          const createResponse = await agentMessagingService.createChat(
            currentTenantId!,
            templateId,
            token!
          );

          console.log('[Chat Interface] ✓ First chat auto-created:', createResponse.chat.id);

          // Set as current chat
          setCurrentChat(createResponse.chat);
          setAllChats([createResponse.chat]);
          setMessages([]);
        } catch (createError) {
          console.error('[Chat Interface] Failed to auto-create chat:', createError);
          // Don't show alert - just log the error
        }
      }
    } catch (error) {
      console.error('[Chat Interface] Error loading chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  /**
   * Create a new chat
   */
  const handleCreateNewChat = async () => {
    if (!currentTenantId) return;

    try {
      const token = await getToken();
      console.log('[Chat Interface] Creating new chat...');

      const createResponse = await agentMessagingService.createChat(
        currentTenantId!,
        templateId,
        token!
      );

      // Reload all chats and select the new one
      await loadChats();
      setCurrentChat(createResponse.chat);
      setMessages([]);
      setCurrentCycleId(null);
      setCycleActivity(null);
      setCycleActivityLabel(null);

      console.log('[Chat Interface] New chat created:', createResponse.chat.id);
    } catch (error) {
      console.error('[Chat Interface] Error creating chat:', error);
      alert('Failed to create new chat');
    }
  };

  /**
   * Delete a chat
   */
  const handleDeleteChat = async (chatId: string) => {
    if (!currentTenantId) return;
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const token = await getToken();
      console.log('[Chat Interface] Deleting chat:', chatId);

      await agentMessagingService.deleteChat(
        currentTenantId!,
        templateId,
        chatId,
        token!
      );

      // Reload chats
      await loadChats();

      // If deleted chat was current, clear it
      if (currentChat?.id === chatId) {
        setCurrentChat(null);
        setMessages([]);
        setCurrentCycleId(null);
        setCycleActivity(null);
        setCycleActivityLabel(null);
      }

      console.log('[Chat Interface] Chat deleted');
    } catch (error) {
      console.error('[Chat Interface] Error deleting chat:', error);
      alert('Failed to delete chat');
    }
  };

  /**
   * Switch to a different chat
   */
  const handleSwitchChat = (chat: Chat) => {
    setCurrentChat(chat);
    setMessages([]);
    setCurrentCycleId(null);
    setCycleActivity(null);
    setCycleActivityLabel(null);
    console.log('[Chat Interface] Switched to chat:', chat.id);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !currentTenantId) return;

    // If no chat exists, create one first
    if (!currentChat) {
      await handleCreateNewChat();
      // Wait a bit for the chat to be created
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!currentChat) {
      alert('Failed to create chat. Please try again.');
      return;
    }

    const userMessageContent = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const token = await getToken();

      // Save user message to chat
      console.log('[Chat Interface] Saving user message to chat...');
      await agentMessagingService.addMessageToChat(
        currentTenantId!,
        templateId,
        currentChat.id,
        'user',
        userMessageContent,
        token!
      );

      console.log('[Chat Interface] Starting cycle...');

      // Start cycle - backend returns immediately with cycle ID
      const response = await agentMessagingService.startCycle(
        {
          tenantId: currentTenantId!,
          templateId: templateId,
          prompt: userMessageContent,
          chatId: currentChat.id
        },
        token!
      );

      console.log('[Chat Interface] ✓ Cycle started:', response.cycle.id);
      console.log('[Chat Interface] Backend is processing - listening for real-time updates...');

      // Set the current cycle ID to start listening for updates
      // The cycle listener will automatically update loading state, activity, and labels
      setCurrentCycleId(response.cycle.id);

      // All updates (loading state, activity labels, messages) come through real-time Firestore listeners

    } catch (error) {
      console.error('[Chat Interface] Error sending message:', error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show loading state while initializing
  if (isLoadingChats) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Chat List Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-14' : 'w-56'} border-r border-gray-200 bg-gray-50 flex flex-col transition-all duration-200`}>
        {/* Header */}
        <div className="p-2 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={handleCreateNewChat}
            className={`flex items-center justify-center ${isSidebarCollapsed ? 'w-full' : 'flex-1'} gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium`}
            title="New Conversation"
          >
            <Plus className="h-4 w-4" />
            {!isSidebarCollapsed && <span className="text-xs">New</span>}
          </button>
          {!isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="ml-2 p-2 hover:bg-gray-200 rounded transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Expand Button (when collapsed) */}
        {isSidebarCollapsed && (
          <div className="p-2 border-b border-gray-200">
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-full p-2 hover:bg-gray-200 rounded transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4 text-gray-600 mx-auto" />
            </button>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {allChats.length === 0 ? (
            <div className={`p-2 text-center text-xs text-gray-500 ${isSidebarCollapsed ? 'hidden' : ''}`}>
              No chats
            </div>
          ) : (
            <div className="p-1 space-y-1">
              {allChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative rounded-lg ${isSidebarCollapsed ? 'p-2' : 'p-2'} cursor-pointer transition-colors ${
                    currentChat?.id === chat.id
                      ? 'bg-white shadow-sm border border-primary-200'
                      : 'hover:bg-white'
                  }`}
                  onClick={() => handleSwitchChat(chat)}
                  title={isSidebarCollapsed ? (chat.name || `Chat ${chat.id.substring(0, 8)}`) : undefined}
                >
                  {isSidebarCollapsed ? (
                    <MessageSquare className="h-5 w-5 text-gray-600 mx-auto" />
                  ) : (
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {chat.name || `Chat ${chat.id.substring(0, 8)}`}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {new Date(chat.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Welcome State */}
        {!currentChat || messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-2xl">
              <div className="backdrop-blur-xl bg-white/90 border border-gray-200 rounded-xl shadow-sm p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  AI Email Template Builder
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Describe what you want and I'll help you create the perfect email template
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
                  <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Example Prompts
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1.5">
                    <li>• "Create a professional welcome email with our company branding"</li>
                    <li>• "Design a promotional newsletter for our summer sale"</li>
                    <li>• "Build a transactional order confirmation email template"</li>
                    <li>• "Make a modern event invitation with RSVP button"</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm max-w-none prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-primary-200' : 'text-gray-500'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Show loading state with cycle activity as a message */}
              {isLoading && cycleActivityLabel && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-3 bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cycleActivityLabel}</p>
                        {cycleActivity === 'brain_thinking' && (
                          <p className="text-xs text-gray-500 mt-1">Analyzing your request and planning the approach...</p>
                        )}
                        {cycleActivity === 'generating_image' && (
                          <p className="text-xs text-gray-500 mt-1">Creating custom images for your template...</p>
                        )}
                        {cycleActivity === 'generating_html' && (
                          <p className="text-xs text-gray-500 mt-1">Building your email template with the latest design...</p>
                        )}
                        {cycleActivity === 'awaiting_clarification' && (
                          <p className="text-xs text-gray-500 mt-1">Please provide additional details to continue...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your email template..."
                className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-sm max-h-32"
                rows={1}
                disabled={isLoading}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                {inputValue.length > 0 && `${inputValue.length} chars`}
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
