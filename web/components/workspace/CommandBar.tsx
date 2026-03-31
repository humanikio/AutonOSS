'use client';

import { Send } from 'lucide-react';

interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  showCommandMenu: boolean;
}

export default function CommandBar({
  value,
  onChange,
  onSend,
  showCommandMenu
}: CommandBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-6 py-3 flex-shrink-0">
      <div className="max-w-4xl mx-auto relative">
        {/* Command Menu */}
        {showCommandMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
            <div className="text-xs font-medium text-gray-500 px-3 py-2 bg-gray-50">Commands</div>
            <button className="w-full px-3 py-2 hover:bg-gray-50 transition-colors text-left text-sm">
              <span className="font-medium text-gray-900">/search</span>
              <span className="text-gray-500 ml-2">Search knowledge base</span>
            </button>
            <button className="w-full px-3 py-2 hover:bg-gray-50 transition-colors text-left text-sm">
              <span className="font-medium text-gray-900">/run</span>
              <span className="text-gray-500 ml-2">Execute workflow</span>
            </button>
            <button className="w-full px-3 py-2 hover:bg-gray-50 transition-colors text-left text-sm">
              <span className="font-medium text-gray-900">/help</span>
              <span className="text-gray-500 ml-2">Show help</span>
            </button>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or / for commands..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
          />

          <button
            onClick={onSend}
            disabled={!value.trim()}
            className="px-4 py-2.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
