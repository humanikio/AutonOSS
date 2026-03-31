'use client';

import { CreationStep } from '../../types/actionCreation';
import { Check, Circle, ArrowRight } from 'lucide-react';

interface ProgressStepsProps {
  currentStep: CreationStep;
  completedSteps: CreationStep[];
  className?: string;
}

const STEPS = [
  { id: 'describe' as CreationStep, label: 'Describe', description: 'Tell us what you want' },
  { id: 'refine' as CreationStep, label: 'Refine', description: 'Perfect the understanding' },
  { id: 'finalize' as CreationStep, label: 'Create', description: 'Generate the action' },
];

export default function ProgressSteps({ 
  currentStep, 
  completedSteps,
  className = ""
}: ProgressStepsProps) {
  const getStepStatus = (stepId: CreationStep) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-green-600 border-green-600 text-white',
          label: 'text-green-600 font-medium',
          description: 'text-green-600'
        };
      case 'current':
        return {
          circle: 'bg-primary-600 border-primary-600 text-white',
          label: 'text-primary-600 font-medium',
          description: 'text-primary-600'
        };
      default:
        return {
          circle: 'bg-gray-100 border-gray-300 text-gray-400',
          label: 'text-gray-400',
          description: 'text-gray-400'
        };
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-4">Creation Progress</h3>
      
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          const styles = getStepStyles(status);
          const isLast = index === STEPS.length - 1;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${styles.circle}`}>
                  {status === 'completed' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" fill={status === 'current' ? 'currentColor' : 'none'} />
                  )}
                </div>
                
                <div className="mt-2 text-center">
                  <div className={`text-sm transition-colors ${styles.label}`}>
                    {step.label}
                  </div>
                  <div className={`text-xs mt-1 transition-colors ${styles.description}`}>
                    {step.description}
                  </div>
                </div>
              </div>
              
              {/* Connector Arrow */}
              {!isLast && (
                <div className="flex-1 flex justify-center mx-4">
                  <ArrowRight className={`h-5 w-5 transition-colors ${
                    completedSteps.includes(step.id) ? 'text-green-400' : 'text-gray-300'
                  }`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-6">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((completedSteps.length + (currentStep === 'describe' ? 0.33 : currentStep === 'refine' ? 0.66 : 1)) / STEPS.length) * 100}%`
            }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Start</span>
          <span className="text-center">
            {Math.round(((completedSteps.length + (currentStep === 'describe' ? 0.33 : currentStep === 'refine' ? 0.66 : 1)) / STEPS.length) * 100)}% Complete
          </span>
          <span>Finish</span>
        </div>
      </div>
    </div>
  );
}