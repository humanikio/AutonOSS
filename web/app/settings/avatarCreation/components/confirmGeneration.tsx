'use client';

import { Check, RotateCcw } from 'lucide-react';

interface ConfirmGenerationProps {
  generatedImage: string;
  onConfirm: () => void;
  onRegenerate: () => void;
}

export default function ConfirmGeneration({ 
  generatedImage, 
  onConfirm, 
  onRegenerate 
}: ConfirmGenerationProps) {
  return (
    <div className="space-y-6">
      {/* Generated Avatar Preview */}
      <div className="relative">
        <div className="w-32 h-32 mx-auto bg-gray-100 rounded-full overflow-hidden shadow-lg">
          <img 
            src={generatedImage} 
            alt="Generated avatar" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Success indicator */}
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
          <Check className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-medium text-gray-900">Your Avatar is Ready!</h3>
        <p className="text-sm text-gray-600 font-light max-w-xs mx-auto">
          Here's your new stylized avatar. You can use this as your profile picture or generate a new one.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onRegenerate}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Generate New
        </button>
        
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
        >
          <Check className="h-4 w-4" />
          Use This Avatar
        </button>
      </div>

      {/* Additional Info */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            AI Generated
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            Privacy Safe
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            Unique
          </span>
        </div>
      </div>
    </div>
  );
}