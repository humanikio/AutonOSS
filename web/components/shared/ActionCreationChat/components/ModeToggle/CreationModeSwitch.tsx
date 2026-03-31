'use client';

import { CreationMode } from '../../types/actionCreation';
import { MessageCircle, Edit3 } from 'lucide-react';

interface CreationModeSwitchProps {
  currentMode: CreationMode;
  onModeChange: (mode: CreationMode) => void;
  disabled?: boolean;
  className?: string;
}

export default function CreationModeSwitch({ 
  currentMode, 
  onModeChange, 
  disabled = false,
  className = ""
}: CreationModeSwitchProps) {
  return (
    <div className={`inline-flex bg-gray-100 rounded-lg p-1 ${className}`}>
      <button
        onClick={() => onModeChange('chat')}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
          currentMode === 'chat'
            ? 'bg-white text-primary-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <MessageCircle className="h-4 w-4" />
        Chat Mode
      </button>
      
      <button
        onClick={() => onModeChange('direct-prompt')}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
          currentMode === 'direct-prompt'
            ? 'bg-white text-primary-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Edit3 className="h-4 w-4" />
        Direct Prompt
      </button>
    </div>
  );
}