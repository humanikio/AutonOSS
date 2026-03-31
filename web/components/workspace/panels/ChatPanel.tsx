/**
 * ChatPanel
 *
 * Chat interface for conversing with an AI agent.
 * Can be connected to a specific agent via config.agentId
 */

'use client';

import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { BasePanelProps, ChatPanelConfig } from '@/types/workspace/panel.types';
import PanelContainer from './PanelContainer';

interface ChatPanelProps extends BasePanelProps {
  config: ChatPanelConfig;
}

export default function ChatPanel({
  panelId,
  config,
  onClose
}: ChatPanelProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      // TODO: Implement actual message sending
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <PanelContainer
      panelId={panelId}
      title={config.title || 'Chat'}
      onClose={onClose}
    >
      <div className="h-full flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-xs">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Start a conversation below</p>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="px-3 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </PanelContainer>
  );
}
