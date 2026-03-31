'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle, CheckCircle } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  botIconImagePath?: string;
}

interface SessionState {
  isActive: boolean;
  startTime?: Date;
  messageCount: number;
  duration: number;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface ChatInterfaceProps {
  agent: Agent;
  sessionState: SessionState;
  onMessageSent: () => void;
}

export default function ChatInterface({
  agent,
  sessionState,
  onMessageSent
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when session starts
  useEffect(() => {
    if (sessionState.isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [sessionState.isActive]);

  // Simulate agent response with typing indicator
  const simulateAgentResponse = async (userMessage: string) => {
    setIsTyping(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    setIsTyping(false);
    
    // Generate a mock response
    const responses = [
      "I understand your request. Let me help you with that.",
      "That's a great question! Here's what I can tell you...",
      "I'd be happy to assist you with that. Let me gather the information.",
      "Thank you for reaching out. Based on what you've shared...",
      "I can definitely help with that. Here's my recommendation..."
    ];
    
    const agentResponse: Message = {
      id: `agent_${Date.now()}`,
      content: responses[Math.floor(Math.random() * responses.length)],
      sender: 'agent',
      timestamp: new Date(),
      status: 'sent'
    };
    
    setMessages(prev => [...prev, agentResponse]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !sessionState.isActive) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    onMessageSent();

    // Update message status to sent
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
      ));
    }, 500);

    // Simulate agent response
    await simulateAgentResponse(userMessage.content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl flex flex-col h-[600px]">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            {agent.botIconImagePath ? (
              <img 
                src={agent.botIconImagePath} 
                alt={`${agent.name} Bot Icon`}
                className="h-6 w-6 object-contain"
              />
            ) : (
              <Bot className="h-6 w-6 text-indigo-600" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-500">
              {sessionState.isActive ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!sessionState.isActive && messages.length === 0 && (
          <div className="text-center py-8">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Bot className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Ready to start training</h4>
            <p className="text-gray-500 text-sm">Start a session to begin chatting with {agent.name}</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <div className={`flex items-center justify-between mt-1 ${
                message.sender === 'user' ? 'text-indigo-200' : 'text-gray-500'
              }`}>
                <span className="text-xs">{formatTime(message.timestamp)}</span>
                {message.sender === 'user' && (
                  <div className="ml-2">
                    {message.status === 'sending' && (
                      <div className="animate-spin rounded-full h-3 w-3 border border-indigo-200 border-t-transparent"></div>
                    )}
                    {message.status === 'sent' && (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    {message.status === 'error' && (
                      <AlertCircle className="h-3 w-3 text-red-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-1">
                <span className="text-sm">{agent.name} is typing</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                sessionState.isActive 
                  ? `Message ${agent.name}...` 
                  : 'Start a session to send messages'
              }
              disabled={!sessionState.isActive}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !sessionState.isActive}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}