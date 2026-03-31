'use client';

import { useState, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function ChatInput({ 
  onSendMessage, 
  isDisabled = false, 
  placeholder = "Describe how you want your agent to behave...",
  className = ""
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || isDisabled || isLoading) return;
    
    const messageToSend = message.trim();
    setMessage('');
    setIsLoading(true);
    
    try {
      await onSendMessage(messageToSend);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const characterCount = message.length;
  const maxLength = 1000;
  const isNearLimit = characterCount > maxLength * 0.8;

  return (
    <div className={`border-t border-gray-200 bg-white p-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isDisabled || isLoading}
            maxLength={maxLength}
            rows={3}
            className={`w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              isDisabled || isLoading ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
            }`}
          />
          
          <button
            onClick={handleSend}
            disabled={!message.trim() || isDisabled || isLoading}
            className={`absolute right-2 bottom-2 p-2 rounded-md transition-colors ${
              message.trim() && !isDisabled && !isLoading
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Send message (Enter)"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className={`${isNearLimit ? 'text-orange-600 font-medium' : ''}`}>
            {characterCount}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}