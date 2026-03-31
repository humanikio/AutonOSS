'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, 
  Send, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { ChatMessage, ChatSession } from '../types';
import { useChatAPI } from '../hooks/useChatAPI';

interface ChatInterfaceProps {
  documentId: string;
  isMinimized: boolean;
  onToggleMinimized: () => void;
}

export default function ChatInterface({
  documentId,
  isMinimized,
  onToggleMinimized
}: ChatInterfaceProps) {
  const [messageInput, setMessageInput] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showChatList, setShowChatList] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    chatSessions,
    isLoading,
    isLoadingChats,
    createNewChat,
    sendMessage,
    loadChatHistory,
    loadChatSessions,
    deleteChat,
    getCurrentChat
  } = useChatAPI(documentId);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat on page load - get current/most recent chat or create new
  useEffect(() => {
    const initializeChat = async () => {
      if (currentChatId) return; // Already have a chat loaded
      
      try {
        console.log('Initializing chat for document:', documentId);
        const { chatId, messages: chatMessages, isNewChat } = await getCurrentChat();
        
        setCurrentChatId(chatId);
        console.log(isNewChat ? `Created new chat: ${chatId}` : `Loaded existing chat: ${chatId}`);
        
        // Load chat sessions to update the list
        loadChatSessions();
        
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
    };

    initializeChat();
  }, [getCurrentChat, currentChatId, documentId, loadChatSessions]);

  const handleCreateNewChat = async () => {
    try {
      const newChatId = await createNewChat();
      setCurrentChatId(newChatId);
      setShowChatList(false);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleSwitchChat = (chatId: string) => {
    setCurrentChatId(chatId);
    loadChatHistory(chatId);
    setShowChatList(false);
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId);
      if (currentChatId === chatId) {
        if (chatSessions.length > 1) {
          const remainingChats = chatSessions.filter(chat => chat.id !== chatId);
          if (remainingChats.length > 0) {
            setCurrentChatId(remainingChats[0].id);
            loadChatHistory(remainingChats[0].id);
          } else {
            handleCreateNewChat();
          }
        } else {
          setCurrentChatId(null);
          handleCreateNewChat();
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentChatId) return;

    const message = messageInput.trim();
    setMessageInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }

    try {
      await sendMessage(currentChatId, message);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Re-add the message to input on error
      setMessageInput(message);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isMinimized) {
    return (
      <div 
        className="bg-white border-r border-gray-200 flex flex-col transition-all duration-300 fixed left-0 bottom-0"
        style={{ 
          top: '5rem',
          width: '4rem',
          zIndex: 20
        }}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col items-center">
            <button
              onClick={onToggleMinimized}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Expand AI Assistant"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={onToggleMinimized}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-2"
              title="AI Assistant"
            >
              <MessageCircle className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white border-r border-gray-200 flex flex-col transition-all duration-300 fixed left-0 bottom-0"
      style={{ 
        top: '5rem',
        width: '24rem',
        zIndex: 30,
        pointerEvents: 'auto'
      }}
    >
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div>
              <h3 className="font-medium text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-500">
                {chatSessions.length} chat{chatSessions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowChatList(!showChatList)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Chat History"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={handleCreateNewChat}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="New Chat"
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={onToggleMinimized}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Minimize"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat List Dropdown */}
      {showChatList && (
        <div className="border-b border-gray-200 bg-gray-50 max-h-48 overflow-y-auto">
          {isLoadingChats ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No chat sessions yet
            </div>
          ) : (
            chatSessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 border-b border-gray-200 hover:bg-gray-100 cursor-pointer flex items-center justify-between ${
                  currentChatId === session.id ? 'bg-indigo-50' : ''
                }`}
                onClick={() => handleSwitchChat(session.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    Chat {session.messageCount} messages
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(session.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Delete chat"
                >
                  <Trash2 className="h-3 w-3 text-gray-400" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading ? (
          <div className="text-center text-gray-500 text-sm mt-8">
            <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p>Start a conversation with your AI assistant</p>
            <p className="text-xs mt-1">Ask for help editing and improving your document</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              // Auto-resize
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
                textareaRef.current.style.height = newHeight + 'px';
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask for help editing your document..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none bg-white"
            rows={1}
            style={{
              minHeight: '40px',
              maxHeight: '120px',
              height: '40px'
            }}
            disabled={!currentChatId || isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || !currentChatId || isLoading}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            style={{ height: '40px' }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}