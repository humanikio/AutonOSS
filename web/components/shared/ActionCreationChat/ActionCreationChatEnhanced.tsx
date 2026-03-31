'use client';

import { ActionCreationChatProps } from './types/actionCreation';
import { PostActionConfiguration } from './types/postActionConfig';
import { useActionCreation } from './hooks/useActionCreation';
import { useState } from 'react';

// Component imports
import CreationModeSwitch from './components/ModeToggle/CreationModeSwitch';
import ChatContainer from './components/ChatInterface/ChatContainer';
import ChatInput from './components/ChatInterface/ChatInput';
import PromptEditor from './components/DirectPromptMode/PromptEditor';
import UnderstandingCard from './components/ActionSummary/UnderstandingCard';
import PostActionWebhookConfig from './components/PostActionConfig/PostActionWebhookConfig';

interface ActionCreationChatEnhancedProps extends ActionCreationChatProps {
  includePostActions?: boolean;
  initialPostActionConfig?: PostActionConfiguration;
  onPostActionConfigChange?: (config: PostActionConfiguration) => void;
}

const DEFAULT_POST_ACTION_CONFIG: PostActionConfiguration = {
  webhook: {
    enabled: false,
    url: '',
    method: 'POST',
    authentication: {
      type: 'none'
    }
  },
  payloadMapping: {
    includeAgentResponse: true,
    includeUserInput: true,
    includeTimestamp: true,
    includeSessionId: true,
    includeAgentId: true,
    includeActionId: true,
    includeCustomData: false
  },
  responseHandling: {
    expectResponse: false,
    timeoutMs: 5000,
    retryOnFailure: false,
    maxRetries: 3
  }
};

export default function ActionCreationChatEnhanced({
  agentId,
  sessionId,
  onActionCreated,
  includePostActions = false,
  initialPostActionConfig,
  onPostActionConfigChange,
  mode = 'embedded',
  className = ''
}: ActionCreationChatEnhancedProps) {
  const { state, actions } = useActionCreation(agentId);
  const [postActionConfig, setPostActionConfig] = useState<PostActionConfiguration>(
    initialPostActionConfig || DEFAULT_POST_ACTION_CONFIG
  );

  const handleContinue = async () => {
    if (state.step === 'describe' || state.step === 'refine') {
      actions.continueToNextStep();
    } else if (state.step === 'finalize') {
      const createdAction = await actions.createAction();
      if (createdAction && onActionCreated) {
        // Include post-action config in the created action if enabled
        if (includePostActions && postActionConfig.webhook.enabled) {
          (createdAction as any).postActionConfig = postActionConfig;
        }
        onActionCreated(createdAction);
      }
    }
  };

  const handlePostActionConfigUpdate = (config: PostActionConfiguration) => {
    setPostActionConfig(config);
    if (onPostActionConfigChange) {
      onPostActionConfigChange(config);
    }
  };

  const handlePromptChange = (prompt: string) => {
    // Just update the local prompt, don't auto-analyze
  };

  const containerClasses = {
    embedded: 'w-full h-full',
    modal: 'w-full max-w-6xl mx-auto',
    fullscreen: 'w-full h-screen'
  };

  const isReadyToShowPostActions = state.aiUnderstanding !== null;

  return (
    <div className={`${containerClasses[mode]} ${className}`}>
      <div className="flex h-full bg-gray-50">
        {/* Left Side - Chat/Configuration */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white">
          {/* Mode Toggle */}
          <div className="p-4 border-b border-gray-200">
            <CreationModeSwitch
              currentMode={state.mode}
              onModeChange={actions.switchMode}
              disabled={state.isLLMTyping}
              className="w-full"
            />
          </div>

          {/* Input Interface */}
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

        {/* Right Side - Understanding & Post Actions */}
        <div className="w-1/2 flex flex-col bg-gray-50">
          <div className="flex-1 overflow-y-auto">
            {/* Understanding Section */}
            <div className="p-6 border-b border-gray-200 bg-white">
              <UnderstandingCard
                understanding={state.aiUnderstanding}
                needsMoreContext={state.needsMoreContext}
                clarifyingQuestion={state.clarifyingQuestion}
                isLoading={state.isLLMTyping}
              />
            </div>

            {/* Post-Action Configuration */}
            {includePostActions && isReadyToShowPostActions && (
              <div className="p-6">
                <PostActionWebhookConfig
                  config={postActionConfig}
                  onConfigUpdate={handlePostActionConfigUpdate}
                  isLoading={state.isLLMTyping}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}