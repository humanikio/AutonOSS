'use client';

import { useState, useEffect } from 'react';
import { AIAgentService, Chat } from '../services/aiAgentService';
import { ChatInterface } from './aiAgentModal/chatInterface';

interface AIAgentModalProps {
  calendarId: string;
}

/**
 * AIAgentModal
 * Main AI agent modal with minimize/maximize functionality
 */
export function AIAgentModal({ calendarId }: AIAgentModalProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [service] = useState(() => new AIAgentService(calendarId));
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showChatList, setShowChatList] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load current chat and chat list on mount
  useEffect(() => {
    loadCurrentChat();
    loadChats();
  }, []);

  const loadCurrentChat = async () => {
    try {
      const chat = await service.getCurrentChat();
      setCurrentChat(chat);
    } catch (error) {
      console.error('Error loading current chat:', error);
    }
  };

  const loadChats = async () => {
    try {
      const chatList = await service.listChats();
      setChats(chatList);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      setLoading(true);
      const newChat = await service.createChat({
        name: `Chat ${new Date().toLocaleDateString()}`
      });
      setCurrentChat(newChat);
      await loadChats();
      setShowChatList(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
      alert('Failed to create new chat');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = async (chat: Chat) => {
    try {
      await service.changeCurrentChat(chat.chatId);
      setCurrentChat(chat);
      setShowChatList(false);
    } catch (error) {
      console.error('Error changing chat:', error);
      alert('Failed to switch chat');
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this chat?')) {
      return;
    }

    try {
      await service.deleteChat(chatId);
      await loadChats();

      // If deleted chat was current, clear current chat
      if (currentChat?.chatId === chatId) {
        setCurrentChat(null);
        await loadCurrentChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat');
    }
  };

  const handleChatUpdate = () => {
    loadCurrentChat();
    loadChats();
  };

  return (
    <>
      {/* Minimized state - floating button */}
      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group z-50"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {/* Badge for unread messages (optional future enhancement) */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">

          </div>
        </button>
      )}

      {/* Expanded state - modal */}
      {!isMinimized && (
        <div className="fixed bottom-6 right-6 w-[480px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200">
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1.5">
                  <img
                    src="/logo/auton-logo.png"
                    alt="Pulseline"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Pulseline AI Assistant</h3>
                  <p className="text-xs text-white/80">
                    {currentChat ? currentChat.name : 'No active chat'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Chat list toggle */}
                <button
                  onClick={() => setShowChatList(!showChatList)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Chat history"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </button>
                {/* New chat button */}
                <button
                  onClick={handleNewChat}
                  disabled={loading}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                  title="New chat"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                {/* Minimize button */}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Minimize"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Chat list sidebar (slides in from left) */}
          {showChatList && (
            <div className="absolute top-[60px] left-0 w-64 h-[calc(100%-60px)] bg-white border-r border-gray-200 shadow-lg z-10">
              <div className="p-3 border-b border-gray-200">
                <h4 className="font-semibold text-sm text-gray-700">Chat History</h4>
              </div>
              <div className="overflow-y-auto h-[calc(100%-52px)]">
                {chats.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No chats yet
                  </div>
                ) : (
                  chats.map((chat) => (
                    <div
                      key={chat.chatId}
                      onClick={() => handleSelectChat(chat)}
                      className={`
                        px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors
                        ${currentChat?.chatId === chat.chatId ? 'bg-blue-50' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {chat.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(chat.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteChat(chat.chatId, e)}
                          className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          title="Delete chat"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              service={service}
              currentChat={currentChat}
              onChatUpdate={handleChatUpdate}
            />
          </div>
        </div>
      )}
    </>
  );
}
