'use client';

import { useState, useEffect } from 'react';
import { FileText, Info } from 'lucide-react';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: (prompt: string) => void;
  isAnalyzing?: boolean;
  placeholder?: string;
  className?: string;
}

export default function PromptEditor({ 
  value, 
  onChange, 
  onAnalyze,
  isAnalyzing = false,
  placeholder = "Enter your direct prompt for the agent...",
  className = ""
}: PromptEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalValue(value);
    setHasChanges(false);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    setHasChanges(newValue !== value);
    onChange(newValue);
  };

  const handleAnalyze = () => {
    if (localValue.trim()) {
      onAnalyze(localValue.trim());
      setHasChanges(false);
    }
  };

  const characterCount = localValue.length;
  const maxLength = 2000;
  const isNearLimit = characterCount > maxLength * 0.8;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Direct Prompt Mode</h3>
          <p className="text-sm text-gray-600">
            Write the exact prompt you want the agent to use for this action
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Tips for Writing Effective Prompts
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Be specific about the agent's personality and tone</li>
              <li>• Include context about when this action should be used</li>
              <li>• Specify the desired response format or structure</li>
              <li>• Mention any constraints or guidelines to follow</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Prompt Editor */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Agent Prompt
        </label>
        <div className="relative">
          <textarea
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={12}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              isAnalyzing ? 'bg-gray-50' : 'bg-white'
            }`}
            disabled={isAnalyzing}
          />
          
          {/* Character Count */}
          <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white px-2 py-1 rounded">
            <span className={isNearLimit ? 'text-orange-600 font-medium' : ''}>
              {characterCount}/{maxLength}
            </span>
          </div>
        </div>
        
        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={!localValue.trim() || isAnalyzing}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              localValue.trim() && !isAnalyzing
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing...
              </div>
            ) : (
              'Analyze Prompt'
            )}
          </button>
        </div>
        
        {hasChanges && (
          <p className="text-sm text-orange-600 flex items-center gap-2">
            <Info className="h-4 w-4" />
            You have unsaved changes. Click "Analyze Prompt" to update the understanding.
          </p>
        )}
      </div>
    </div>
  );
}