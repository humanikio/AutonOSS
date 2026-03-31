'use client';

import { Check, RotateCcw } from 'lucide-react';

interface ConfirmSelfieProps {
  imageData: string;
  onConfirm: () => void;
  onRetake: () => void;
}

export default function ConfirmSelfie({ imageData, onConfirm, onRetake }: ConfirmSelfieProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Image Preview - Smaller and centered like camera */}
      <div className="flex-1 flex items-center justify-center mb-4">
        <div className="relative w-80 h-80 bg-gray-100 rounded-xl overflow-hidden shadow-lg">
          <img 
            src={imageData} 
            alt="Captured selfie" 
            className="w-full h-full object-cover"
          />
          
          {/* Preview overlay */}
          <div className="absolute inset-0 rounded-xl border-2 border-primary-500/20"></div>

        </div>
      </div>

      {/* Instructions */}
      <div className="text-center mb-4">
        <h3 className="font-medium text-gray-900 mb-2">How does this look?</h3>
        <p className="text-sm text-gray-600 font-light">
          We'll use this photo to create a stylized avatar for your profile
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center mb-4">
        <button
          onClick={onRetake}
          className="flex items-center gap-2 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Retake Photo
        </button>
        
        <button
          onClick={onConfirm}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl transition-colors shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          Looks Good
        </button>
      </div>

      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs text-gray-400 text-center font-light">
          Your original photo will not be stored - only the generated avatar
        </p>
      </div>
    </div>
  );
}