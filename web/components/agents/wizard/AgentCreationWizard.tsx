'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { CallAgentRequest, AgentCreationStep } from '@/types';
import StepBasicInfo from './StepBasicInfo';
import StepVoiceSelection from './StepVoiceSelection';
import StepKnowledgeBase from './StepKnowledgeBase';
import StepBehaviorSettings from './StepBehaviorSettings';
import StepConversationConfig from './StepConversationConfig';
import StepReview from './StepReview';

interface AgentCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (agent: CallAgentRequest) => void;
  initialData?: Partial<CallAgentRequest>;
  mode?: 'create' | 'edit';
}

const STEPS: AgentCreationStep[] = [
  {
    step: 1,
    title: 'Basic Information',
    description: 'Set up your agent\'s name and purpose',
    isComplete: false,
    data: {}
  },
  {
    step: 2,
    title: 'Voice Selection',
    description: 'Choose and configure your agent\'s voice',
    isComplete: false,
    data: {}
  },
  {
    step: 3,
    title: 'Knowledge Base',
    description: 'Connect your business data to the agent',
    isComplete: false,
    data: {}
  },
  {
    step: 4,
    title: 'Conversation Settings',
    description: 'Configure how your agent communicates',
    isComplete: false,
    data: {}
  },
  {
    step: 5,
    title: 'Behavior Settings',
    description: 'Set up call handling and advanced options',
    isComplete: false,
    data: {}
  },
  {
    step: 6,
    title: 'Review & Create',
    description: 'Review your settings and create the agent',
    isComplete: false,
    data: {}
  }
];

export default function AgentCreationWizard({ isOpen, onClose, onSuccess, initialData, mode = 'create' }: AgentCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<AgentCreationStep[]>(STEPS);
  const [agentData, setAgentData] = useState<Partial<CallAgentRequest>>({});
  const [isCreating, setIsCreating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset wizard when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setSteps(STEPS);
      setAgentData(initialData || {});
      setIsCreating(false);
    }
  }, [isOpen, initialData]);

  const updateStepData = useCallback((stepNumber: number, data: Partial<CallAgentRequest>) => {
    setAgentData(prev => ({ ...prev, ...data }));
    
    setSteps(prev => prev.map(step => 
      step.step === stepNumber 
        ? { ...step, data, isComplete: true }
        : step
    ));
  }, []);

  // Create stable callback functions for each step
  const updateStep1 = useCallback((data: Partial<CallAgentRequest>) => updateStepData(1, data), [updateStepData]);
  const updateStep2 = useCallback((data: Partial<CallAgentRequest>) => updateStepData(2, data), [updateStepData]);
  const updateStep3 = useCallback((data: Partial<CallAgentRequest>) => updateStepData(3, data), [updateStepData]);
  const updateStep4 = useCallback((data: Partial<CallAgentRequest>) => updateStepData(4, data), [updateStepData]);
  const updateStep5 = useCallback((data: Partial<CallAgentRequest>) => updateStepData(5, data), [updateStepData]);
  const updateStep6 = useCallback((data: Partial<CallAgentRequest>) => updateStepData(6, data), [updateStepData]);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const canProceedToNext = () => {
    const currentStepData = steps.find(s => s.step === currentStep);
    return currentStepData?.isComplete || false;
  };

  const nextStep = () => {
    if (currentStep < 6 && canProceedToNext()) {
      setCurrentStep(prev => prev + 1);
      scrollToTop();
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      scrollToTop();
    }
  };

  const handleCreateAgent = async () => {
    if (!agentData.name || !agentData.description || !agentData.purpose) {
      return;
    }

    setIsCreating(true);
    
    try {
      // Build complete agent request with proper defaults
      const completeAgentData: CallAgentRequest = {
        name: agentData.name,
        description: agentData.description,
        purpose: agentData.purpose,
        voiceConfig: {
          voiceId: agentData.voiceConfig?.voiceId || 'pNInz6obpgDQGcFmaJgB',
          voiceName: agentData.voiceConfig?.voiceName,
          model: agentData.voiceConfig?.model || 'eleven_turbo_v2_5',
          stability: agentData.voiceConfig?.stability ?? 0.5,
          similarity: agentData.voiceConfig?.similarity ?? 0.8,
          speed: agentData.voiceConfig?.speed ?? 1.0,
          optimizeLatency: agentData.voiceConfig?.optimizeLatency
        },
        conversationConfig: {
          firstMessage: agentData.conversationConfig?.firstMessage || 'Hello! How can I help you today?',
          systemPrompt: agentData.conversationConfig?.systemPrompt || 'You are a helpful AI assistant.',
          language: agentData.conversationConfig?.language || 'en',
          maxDurationSeconds: agentData.conversationConfig?.maxDurationSeconds ?? 600,
          llmModel: agentData.conversationConfig?.llmModel || 'gemini-2.0-flash',
          temperature: agentData.conversationConfig?.temperature ?? 0.7,
          knowledgeBase: {
            useBusinessInfo: agentData.conversationConfig?.knowledgeBase?.useBusinessInfo ?? false,
            useProducts: agentData.conversationConfig?.knowledgeBase?.useProducts ?? false,
            selectedProductIds: agentData.conversationConfig?.knowledgeBase?.selectedProductIds || [],
            useFAQs: agentData.conversationConfig?.knowledgeBase?.useFAQs ?? false,
            selectedFAQCategories: agentData.conversationConfig?.knowledgeBase?.selectedFAQCategories || [],
            useBrandGuidelines: agentData.conversationConfig?.knowledgeBase?.useBrandGuidelines ?? false,
            customKnowledge: agentData.conversationConfig?.knowledgeBase?.customKnowledge,
            elevenlabsKnowledgeBases: agentData.conversationConfig?.knowledgeBase?.elevenlabsKnowledgeBases || []
          }
        },
        behaviorSettings: {
          // System tools (new structure)
          systemTools: {
            endCall: agentData.behaviorSettings?.systemTools?.endCall ?? true,
            detectLanguage: agentData.behaviorSettings?.systemTools?.detectLanguage ?? false,
            skipTurn: agentData.behaviorSettings?.systemTools?.skipTurn ?? false,
            transferToAgent: agentData.behaviorSettings?.systemTools?.transferToAgent ?? false,
            transferToNumber: agentData.behaviorSettings?.systemTools?.transferToNumber ?? false,
            playKeypardTouchTone: agentData.behaviorSettings?.systemTools?.playKeypardTouchTone ?? false,
            voicemailDetection: agentData.behaviorSettings?.systemTools?.voicemailDetection ?? true,
          },
          // Legacy settings (for backward compatibility)
          endCallOnGoodbye: agentData.behaviorSettings?.endCallOnGoodbye ?? true,
          voicemailDetection: agentData.behaviorSettings?.voicemailDetection ?? true,
          voicemailMessage: agentData.behaviorSettings?.voicemailMessage,
          transferEnabled: agentData.behaviorSettings?.transferEnabled ?? false,
          transferNumbers: agentData.behaviorSettings?.transferNumbers || [],
          interruptionSensitivity: agentData.behaviorSettings?.interruptionSensitivity || 'medium',
          silenceTimeoutSeconds: agentData.behaviorSettings?.silenceTimeoutSeconds ?? 30,
          maxRetries: agentData.behaviorSettings?.maxRetries
        }
      };

      onSuccess(completeAgentData);
      onClose();
    } catch (error) {
      console.error('Failed to create agent:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepBasicInfo
            data={agentData}
            onUpdate={updateStep1}
          />
        );
      case 2:
        return (
          <StepVoiceSelection
            data={agentData}
            onUpdate={updateStep2}
          />
        );
      case 3:
        return (
          <StepKnowledgeBase
            data={agentData}
            onUpdate={updateStep3}
          />
        );
      case 4:
        return (
          <StepConversationConfig
            data={agentData}
            onUpdate={updateStep4}
          />
        );
      case 5:
        return (
          <StepBehaviorSettings
            data={agentData}
            onUpdate={updateStep5}
          />
        );
      case 6:
        return (
          <StepReview
            data={agentData}
            onUpdate={updateStep6}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{mode === 'edit' ? 'Edit Call Agent' : 'Create Call Agent'}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Step {currentStep} of 6: {steps.find(s => s.step === currentStep)?.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.step < currentStep || step.isComplete
                      ? 'bg-blue-600 text-white'
                      : step.step === currentStep
                      ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.step}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 w-12 ml-2 ${
                      step.step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h3 className="font-medium text-gray-900">
              {steps.find(s => s.step === currentStep)?.title}
            </h3>
            <p className="text-sm text-gray-600">
              {steps.find(s => s.step === currentStep)?.description}
            </p>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div ref={scrollContainerRef} className="flex-1 p-6 overflow-y-auto">
          {renderStepContent()}
        </div>

        {/* Footer - Always Visible */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={previousStep}
            disabled={currentStep === 1}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            {currentStep < 6 ? (
              <button
                onClick={nextStep}
                disabled={!canProceedToNext()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleCreateAgent}
                disabled={!canProceedToNext() || isCreating}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (mode === 'edit' ? 'Updating Agent...' : 'Creating Agent...') : (mode === 'edit' ? 'Update Agent' : 'Create Agent')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}