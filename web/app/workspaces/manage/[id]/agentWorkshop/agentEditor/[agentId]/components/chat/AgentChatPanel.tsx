/**
 * AgentChatPanel
 *
 * Chat panel using chimera API for real message persistence.
 */

'use client';

import { useEffect, useRef } from 'react';
import { MessageCircle, Trash2, Plus } from 'lucide-react';
import { ChimeraChat, ChimeraMessage } from '../../services/useChimeraChat';
import ChatInput from './ChatInput';

interface AgentChatPanelProps {
  // Chimera chat
  chats: ChimeraChat[];
  currentChatId: string | null;
  messages: ChimeraMessage[];
  isLoading: boolean;
  isSending: boolean;
  onSendMessage: (content: string) => Promise<string | null>;
  onCreateChat: () => Promise<string | null>;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => Promise<boolean>;
  agentName?: string;
}

export default function AgentChatPanel({
  chats,
  currentChatId,
  messages,
  isLoading,
  isSending,
  onSendMessage,
  onCreateChat,
  onSelectChat,
  onDeleteChat,
  agentName,
}: AgentChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasMessages = messages.length > 0;
  const hasChats = chats.length > 0;

  const handleCreateChat = async () => {
    await onCreateChat();
  };

  const handleSend = async (content: string) => {
    // If no chat exists, create one first
    if (!currentChatId) {
      const newChatId = await onCreateChat();
      if (!newChatId) return;
    }
    await onSendMessage(content);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCreateChat}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
            title="New Chat"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {currentChatId && (
            <button
              onClick={() => onDeleteChat(currentChatId)}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition-colors"
              title="Delete Chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chat Selector */}
      {hasChats && (
        <div className="px-3 py-2 border-b border-slate-200">
          <select
            value={currentChatId || ''}
            onChange={(e) => onSelectChat(e.target.value)}
            className="w-full bg-slate-50 text-slate-700 text-xs rounded px-2 py-1.5 border border-slate-200 focus:outline-none focus:border-slate-300"
          >
            <option value="" disabled>
              Select a chat...
            </option>
            {chats.filter(chat => chat.chatId).map((chat) => (
              <option key={chat.chatId} value={chat.chatId}>
                {chat.title || `Chat ${chat.chatId.slice(0, 8)}...`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {hasMessages ? (
          <div className="px-3 py-4 space-y-3">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.messageId}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-primary-600 text-white rounded-2xl rounded-br-sm'
                        : 'bg-white text-slate-700 rounded-2xl rounded-bl-sm border border-slate-200 shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex justify-start">
                <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl rounded-bl-sm shadow-sm">
                  <div className="flex gap-1">
                    <div
                      className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center px-4">
            <div className="text-center">
              <MessageCircle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600">
                {agentName ? `Chat with ${agentName}` : 'Test your agent'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {currentChatId ? 'Send a message to start' : 'Create a chat to begin'}
              </p>
              {!currentChatId && (
                <button
                  onClick={handleCreateChat}
                  disabled={isLoading}
                  className="mt-3 px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'New Chat'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <ChatInput
          onSend={handleSend}
          isProcessing={isSending}
          placeholder="Message..."
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
