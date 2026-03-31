/**
 * ChatMessage
 *
 * Message bubble with dark mode support.
 */

'use client';

import { ChatMessage as ChatMessageType } from '../../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
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
}
