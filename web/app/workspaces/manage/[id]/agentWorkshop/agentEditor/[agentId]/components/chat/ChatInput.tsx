/**
 * ChatInput
 *
 * Clean chat input with dark mode support.
 */

'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isProcessing: boolean;
  placeholder?: string;
  dark?: boolean;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  isProcessing,
  placeholder = 'Type a message...',
  dark = false,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!message.trim() || isProcessing) return;
    onSend(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = isProcessing || disabled;
  const canSend = message.trim() && !isDisabled;

  if (dark) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          className="flex-1 px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-full text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`p-2.5 rounded-full transition-colors ${
            canSend
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-slate-800 text-slate-600'
          }`}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-full placeholder:text-slate-400 focus:outline-none focus:border-slate-300 disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={`p-2.5 rounded-full transition-colors ${
          canSend
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-slate-100 text-slate-300'
        }`}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
