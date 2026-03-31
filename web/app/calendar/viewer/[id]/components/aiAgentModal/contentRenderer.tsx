'use client';

import ReactMarkdown from 'react-markdown';
import { Message } from '../../services/aiAgentService';
import { ToolMessage } from './toolMessage';

interface ContentRendererProps {
  message: Message;
}

/**
 * ContentRenderer
 * Renders individual messages with different styling for user vs assistant
 * Detects and renders tool messages with special styling
 */
export function ContentRenderer({ message }: ContentRendererProps) {
  // Check if this is a tool message first
  const isToolMessage = message.metadata?.toolMessage === true;

  // If it's a tool message, use the ToolMessage component
  if (isToolMessage) {
    return <ToolMessage message={message} />;
  }

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Format timestamp
  const timestamp = new Date(message.createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Check if message indicates an error
  const isError = message.metadata?.error === true;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div
          className={`
            rounded-2xl px-4 py-3 shadow-sm
            ${isUser
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
              : isError
              ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-900 border border-red-200'
              : 'bg-white border border-gray-200 text-gray-900'
            }
          `}
        >
          {/* Role indicator for assistant */}
          {isAssistant && !isError && (
            <div className="flex items-center gap-2 mb-2">
              <img
                src="/logo/auton-logo.png"
                alt="Pulseline"
                className="w-6 h-6 object-contain"
              />
              <span className="text-xs font-medium text-gray-500">Pulseline</span>
            </div>
          )}

          {/* Error indicator */}
          {isError && (
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-xs font-medium text-red-600">Error</span>
            </div>
          )}

          {/* Message content */}
          {isAssistant && !isError ? (
            <div className="text-sm prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:my-2 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-gray-700 prose-a:text-blue-600 prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'text-white' : 'text-gray-900'}`}>
              {message.content}
            </div>
          )}

          {/* Tool calls indicator */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 font-medium mb-2">Actions taken:</div>
              <div className="space-y-1">
                {message.toolCalls.map((tool, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{tool.tool}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event/Task links */}
          {(message.eventId || message.taskId) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {message.eventId && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Event created</span>
                  </div>
                )}
                {message.taskId && (
                  <div className="flex items-center gap-1 text-xs text-cyan-600 bg-cyan-50 px-2 py-1 rounded">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Task created</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-400 mt-1 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {timestamp}
        </div>
      </div>
    </div>
  );
}
