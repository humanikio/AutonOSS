'use client';

import { Shield, AlertTriangle } from 'lucide-react';

interface ForceProceedToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function ForceProceedToggle({ 
  isEnabled, 
  onToggle, 
  disabled = false,
  className = ""
}: ForceProceedToggleProps) {
  return (
    <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {isEnabled ? (
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
          ) : (
            <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-orange-900">
                Force Proceed Override
              </h4>
              <p className="text-sm text-orange-700 mt-1">
                {isEnabled 
                  ? "You can proceed with your current input even if AI suggests more refinement."
                  : "Let AI guide the refinement process for optimal results."
                }
              </p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => onToggle(e.target.checked)}
                disabled={disabled}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}></div>
            </label>
          </div>
          
          {isEnabled && (
            <div className="mt-3 p-3 bg-orange-100 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-700 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-800">
                  <strong>Warning:</strong> Proceeding without full AI refinement may result in less optimal action performance. 
                  The AI recommendations are designed to improve your action's effectiveness.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}