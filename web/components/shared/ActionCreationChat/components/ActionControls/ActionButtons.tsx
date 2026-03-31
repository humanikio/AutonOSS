'use client';

import { CreationStep, CreationMode } from '../../types/actionCreation';
import { ArrowLeft, ArrowRight, Save, Sparkles, RefreshCw } from 'lucide-react';

interface ActionButtonsProps {
  currentStep: CreationStep;
  currentMode: CreationMode;
  canProceed: boolean;
  forceProceed: boolean;
  isProcessing: boolean;
  onBack?: () => void;
  onContinue?: () => void;
  onSave?: () => void;
  onRestart?: () => void;
  needsMoreContext?: boolean;
  className?: string;
}

export default function ActionButtons({ 
  currentStep, 
  currentMode,
  canProceed, 
  forceProceed,
  isProcessing,
  onBack,
  onContinue,
  onSave,
  onRestart,
  needsMoreContext = false,
  className = ""
}: ActionButtonsProps) {
  
  const getButtonText = () => {
    if (currentStep === 'describe') {
      if (needsMoreContext && !forceProceed) {
        return 'Continue Refinement';
      }
      return 'Continue to Refine';
    }
    if (currentStep === 'refine') {
      return 'Create Action';
    }
    return 'Save Action';
  };

  const getButtonIcon = () => {
    if (currentStep === 'finalize') {
      return Save;
    }
    if (needsMoreContext && !forceProceed) {
      return RefreshCw;
    }
    return ArrowRight;
  };

  const ButtonIcon = getButtonIcon();
  const buttonText = getButtonText();
  
  const shouldShowProceed = canProceed || forceProceed;
  const shouldDisable = isProcessing || (!canProceed && !forceProceed);

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {/* Left Side - Back/Restart */}
      <div className="flex items-center gap-3">
        {(currentStep !== 'describe' || currentMode === 'direct-prompt') && onBack && (
          <button
            onClick={onBack}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
        
        {onRestart && (
          <button
            onClick={onRestart}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Start Over
          </button>
        )}
      </div>

      {/* Right Side - Primary Actions */}
      <div className="flex items-center gap-3">
        {/* Force Proceed Badge */}
        {forceProceed && needsMoreContext && (
          <div className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Override Active
          </div>
        )}
        
        {/* Continue/Save Button */}
        {(shouldShowProceed && onContinue) && (
          <button
            onClick={onContinue}
            disabled={shouldDisable}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              shouldDisable
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : forceProceed && needsMoreContext
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <ButtonIcon className="h-4 w-4" />
                {buttonText}
              </>
            )}
          </button>
        )}

        {/* Save Button (for finalize step) */}
        {currentStep === 'finalize' && onSave && (
          <button
            onClick={onSave}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              isProcessing
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Action
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}