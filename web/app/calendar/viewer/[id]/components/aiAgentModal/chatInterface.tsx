'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Message, Chat, AIAgentService } from '../../services/aiAgentService';
import { ContentRenderer } from './contentRenderer';

interface ChatInterfaceProps {
  service: AIAgentService;
  currentChat: Chat | null;
  onChatUpdate?: () => void;
}

export function ChatInterface({ service, currentChat, onChatUpdate }: ChatInterfaceProps) {
  const { currentTenantId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time Firestore listener for messages
  useEffect(() => {
    if (!currentChat?.chatId || !currentTenantId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener
    const messagesRef = collection(
      db,
      'tenants',
      currentTenantId,
      'calendars',
      'autonCalendar',
      'aiAgent',
      'main',
      'chats',
      currentChat.chatId,
      'messages'
    );

    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            messageId: doc.id,
            createdAt: data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : data.createdAt,
          } as Message;
        });

        setMessages(msgs);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to messages:', error);
        setError('Failed to load messages');
        setLoading(false);
      }
    );

    // Cleanup listener on unmount or chat change
    return () => unsubscribe();
  }, [currentChat?.chatId, currentTenantId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || sending) return;

    const prompt = inputValue.trim();
    setInputValue('');
    setSending(true);
    setError(null);

    try {
      await service.sendMessage(prompt, currentChat?.chatId);
      // No need to manually load messages - Firestore listener will update automatically
      onChatUpdate?.();
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      setInputValue(prompt);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="text-sm text-gray-500 mt-2">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white shadow-lg flex items-center justify-center p-3">
                <img
                  src="/logo/auton-logo.png"
                  alt="Pulseline"
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Start a conversation</h3>
              <p className="text-sm text-gray-500">
                Ask me to create events, manage tasks, or help organize your calendar.
              </p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => setInputValue('Schedule a meeting tomorrow at 2pm')}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Schedule a meeting tomorrow at 2pm
                </button>
                <button
                  onClick={() => setInputValue('What tasks do I have due this week?')}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  What tasks do I have due this week?
                </button>
                <button
                  onClick={() => setInputValue('Show me my schedule for next Monday')}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Show me my schedule for next Monday
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ContentRenderer key={message.messageId} message={message} />
            ))}
            {sending && (
              <div className="flex justify-start mb-4">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">Pulseline is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your calendar..."
              disabled={sending}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              rows={1}
            />
            <div className="text-xs text-gray-400 mt-1 px-1">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || sending}
            className="flex-shrink-0 h-11 px-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md disabled:shadow-none"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Send</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
