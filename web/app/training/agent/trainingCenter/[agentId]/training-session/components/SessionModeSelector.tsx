'use client';

import { MessageSquare, Phone } from 'lucide-react';

type SessionMode = 'chat' | 'call';

interface SessionModeSelectorProps {
  currentMode: SessionMode;
  onModeChange: (mode: SessionMode) => void;
  disabled?: boolean;
}

export default function SessionModeSelector({
  currentMode,
  onModeChange,
  disabled = false
}: SessionModeSelectorProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Training Mode</h3>
      
      <div className="space-y-3">
        <button
          onClick={() => onModeChange('chat')}
          disabled={disabled}
          className={`w-full p-4 border rounded-lg transition-all ${
            currentMode === 'chat'
              ? 'border-blue-500 bg-blue-50 shadow-sm'
              : 'border-gray-200 hover:border-gray-300'
          } ${
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              currentMode === 'chat' 
                ? 'bg-blue-100' 
                : 'bg-gray-100'
            }`}>
              <MessageSquare className={`h-5 w-5 ${
                currentMode === 'chat' 
                  ? 'text-blue-600' 
                  : 'text-gray-500'
              }`} />
            </div>
            <div className="text-left">
              <h4 className={`font-medium ${
                currentMode === 'chat' 
                  ? 'text-blue-900' 
                  : 'text-gray-900'
              }`}>
                Chat Mode
              </h4>
              <p className="text-sm text-gray-500">Text-based conversations</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onModeChange('call')}
          disabled={disabled}
          className={`w-full p-4 border rounded-lg transition-all ${
            currentMode === 'call'
              ? 'border-green-500 bg-green-50 shadow-sm'
              : 'border-gray-200 hover:border-gray-300'
          } ${
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              currentMode === 'call' 
                ? 'bg-green-100' 
                : 'bg-gray-100'
            }`}>
              <Phone className={`h-5 w-5 ${
                currentMode === 'call' 
                  ? 'text-green-600' 
                  : 'text-gray-500'
              }`} />
            </div>
            <div className="text-left">
              <h4 className={`font-medium ${
                currentMode === 'call' 
                  ? 'text-green-900' 
                  : 'text-gray-900'
              }`}>
                Call Mode
              </h4>
              <p className="text-sm text-gray-500">Voice-based conversations</p>
            </div>
          </div>
        </button>
      </div>

      {disabled && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            Mode cannot be changed during an active session
          </p>
        </div>
      )}
    </div>
  );
}