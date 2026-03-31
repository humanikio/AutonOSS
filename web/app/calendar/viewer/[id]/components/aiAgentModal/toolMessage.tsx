'use client';

import { Message } from '../../services/aiAgentService';

interface ToolMessageProps {
  message: Message;
}

/**
 * ToolMessage
 * Renders tool operation messages with special minimalistic styling
 * Shows pending, success, and error states for tool operations
 */
export function ToolMessage({ message }: ToolMessageProps) {
  const toolMetadata = message.metadata;

  if (!toolMetadata?.toolMessage) {
    return null;
  }

  const { toolType, action, status, entityId, count, error } = toolMetadata;

  // Format timestamp
  const timestamp = new Date(message.createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Get icon based on tool type
  const getToolIcon = () => {
    switch (toolType) {
      case 'task':
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'event':
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'calendar':
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'search':
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  // Get status indicator
  const getStatusIndicator = () => {
    switch (status) {
      case 'pending':
        return (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        );
      case 'success':
        return (
          <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Get background and border colors based on status
  const getStatusColors = () => {
    switch (status) {
      case 'pending':
        return 'bg-blue-50/50 border-blue-200/70 text-blue-800';
      case 'success':
        return 'bg-green-50/50 border-green-200/70 text-green-800';
      case 'error':
        return 'bg-red-50/50 border-red-200/70 text-red-800';
      default:
        return 'bg-gray-50/50 border-gray-200/70 text-gray-800';
    }
  };

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[80%]">
        {/* Tool message bubble - minimalistic design */}
        <div
          className={`
            rounded-xl px-3 py-2 border shadow-sm
            ${getStatusColors()}
            transition-all duration-200
          `}
        >
          <div className="flex items-center gap-2">
            {/* Tool icon */}
            <div className={`
              flex-shrink-0
              ${status === 'pending' ? 'text-blue-500' : ''}
              ${status === 'success' ? 'text-green-500' : ''}
              ${status === 'error' ? 'text-red-500' : ''}
            `}>
              {getToolIcon()}
            </div>

            {/* Message content */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium leading-relaxed">
                {message.content}
              </div>

              {/* Show count if present */}
              {count !== undefined && count > 0 && status === 'success' && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {count} item{count !== 1 ? 's' : ''}
                </div>
              )}

              {/* Show error details if present */}
              {error && status === 'error' && (
                <div className="text-[10px] text-red-600 mt-0.5">
                  {error}
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className="flex-shrink-0">
              {getStatusIndicator()}
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-[10px] text-gray-400 mt-1 px-2">
          {timestamp}
        </div>
      </div>
    </div>
  );
}
