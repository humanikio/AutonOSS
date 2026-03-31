'use client';

import { ActionCreationChatProps, CreationStep } from './types/actionCreation';
import { useActionCreation } from './hooks/useActionCreation';

// Component imports
import CreationModeSwitch from './components/ModeToggle/CreationModeSwitch';
import ChatContainer from './components/ChatInterface/ChatContainer';
import ChatInput from './components/ChatInterface/ChatInput';
import PromptEditor from './components/DirectPromptMode/PromptEditor';
import UnderstandingCard from './components/ActionSummary/UnderstandingCard';
import ProgressSteps from './components/ActionControls/ProgressSteps';
import ForceProceedToggle from './components/ActionControls/ForceProceedToggle';
import ActionButtons from './components/ActionControls/ActionButtons';

export default function ActionCreationChat({
  agentId,
  sessionId,
  onActionCreated,
  mode = 'embedded',
  className = ''
}: ActionCreationChatProps) {
  const { state, actions } = useActionCreation(agentId);

  const handleContinue = async () => {
    if (state.step === 'describe' || state.step === 'refine') {
      actions.continueToNextStep();
    } else if (state.step === 'finalize') {
      const createdAction = await actions.createAction();
      if (createdAction && onActionCreated) {
        onActionCreated(createdAction);
      }
    }
  };

  const handlePromptChange = (prompt: string) => {
    // Just update the local prompt, don't auto-analyze
    // User will click "Analyze Prompt" when ready
  };

  const completedSteps: CreationStep[] = state.step === 'describe' ? [] : 
                       state.step === 'refine' ? ['describe'] : 
                       ['describe', 'refine'];

  const containerClasses = {
    embedded: 'w-full h-full',
    modal: 'w-full max-w-6xl mx-auto',
    fullscreen: 'w-full h-screen'
  };

  return (
    <div className={`${containerClasses[mode]} ${className}`}>
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Create New Action</h1>
              <p className="text-gray-600 mt-1">
                Define how your agent should behave for specific scenarios
              </p>
            </div>
            
            <CreationModeSwitch
              currentMode={state.mode}
              onModeChange={actions.switchMode}
              disabled={state.isLLMTyping}
            />
          </div>
          
          <ProgressSteps
            currentStep={state.step}
            completedSteps={completedSteps}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Input Interface */}
          <div className="w-1/2 flex flex-col border-r border-gray-200">
            {state.mode === 'chat' ? (
              <>
                <ChatContainer
                  messages={state.messages}
                  isTyping={state.isLLMTyping}
                  className="flex-1"
                />
                <ChatInput
                  onSendMessage={actions.handleUserMessage}
                  isDisabled={state.isLLMTyping}
                  placeholder="Describe how you want your agent to behave..."
                />
              </>
            ) : (
              <div className="flex-1 p-6 overflow-y-auto">
                <PromptEditor
                  value={state.currentPrompt}
                  onChange={handlePromptChange}
                  onAnalyze={actions.handlePromptAnalysis}
                  isAnalyzing={state.isLLMTyping}
                />
              </div>
            )}
          </div>

          {/* Right Side - Understanding & Controls */}
          <div className="w-1/2 flex flex-col">
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Understanding Card */}
              <UnderstandingCard
                understanding={state.aiUnderstanding}
                needsMoreContext={state.needsMoreContext}
                clarifyingQuestion={state.clarifyingQuestion}
                isLoading={state.isLLMTyping}
              />

              {/* Force Proceed Toggle (only show when needed) */}
              {state.needsMoreContext && (
                <ForceProceedToggle
                  isEnabled={state.forceProceed}
                  onToggle={actions.toggleForceProceed}
                  disabled={state.isLLMTyping}
                />
              )}

              {/* Final Action Preview (on finalize step) */}
              {state.step === 'finalize' && state.finalAction && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-green-900 mb-3">
                    🎉 Action Ready!
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Name</h4>
                      <p className="text-gray-700">{state.finalAction.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Description</h4>
                      <p className="text-gray-700">{state.finalAction.description}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Generated Prompt</h4>
                      <div className="bg-white border border-green-200 rounded p-3 text-sm font-mono text-gray-800 max-h-32 overflow-y-auto">
                        {state.finalAction.prompt}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 bg-white">
              <ActionButtons
                currentStep={state.step}
                currentMode={state.mode}
                canProceed={state.canProceed}
                forceProceed={state.forceProceed}
                isProcessing={state.isLLMTyping}
                needsMoreContext={state.needsMoreContext}
                onContinue={handleContinue}
                onRestart={actions.resetCreation}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}