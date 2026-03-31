'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, User, Mic, Database, MessageSquare, Settings, Eye } from 'lucide-react';
import { CallAgentRequest } from '@/types';

interface StepReviewProps {
  data: Partial<CallAgentRequest>;
  onUpdate: (data: Partial<CallAgentRequest>) => void;
}

export default function StepReview({ data, onUpdate }: StepReviewProps) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  const getCompletionStatus = () => {
    const checks = [
      { label: 'Basic Info', complete: !!(data.name && data.description && data.purpose) },
      { label: 'Voice Config', complete: !!(data.voiceConfig?.voiceId) },
      { label: 'Knowledge Base', complete: true }, // Always true as it's optional
      { label: 'Conversation', complete: !!(data.conversationConfig?.firstMessage && data.conversationConfig?.systemPrompt) },
      { label: 'Behavior', complete: !!(data.behaviorSettings) }
    ];
    
    const completed = checks.filter(check => check.complete).length;
    return { checks, completed, total: checks.length };
  };

  // Mark this step as complete when all validation passes
  useEffect(() => {
    const { completed, total } = getCompletionStatus();
    const isComplete = completed === total;
    
    if (isComplete) {
      onUpdate({}); // Empty update just to mark step as complete
    }
  }, [data.name, data.description, data.purpose, data.voiceConfig?.voiceId, data.conversationConfig?.firstMessage, data.conversationConfig?.systemPrompt, data.behaviorSettings]);

  const generateFullPrompt = () => {
    let prompt = '';
    
    // System instructions
    if (data.conversationConfig?.systemPrompt) {
      prompt += data.conversationConfig.systemPrompt + '\n\n';
    }

    // Knowledge base info
    if (data.conversationConfig?.knowledgeBase) {
      const kb = data.conversationConfig.knowledgeBase;
      if (kb.useBusinessInfo) {
        prompt += 'You have access to complete business information including company details, mission, and contact information.\n';
      }
      if (kb.useProducts && kb.selectedProductIds && kb.selectedProductIds.length > 0) {
        prompt += `You can help customers with ${kb.selectedProductIds.length} products/services.\n`;
      }
      if (kb.useFAQs && kb.selectedFAQCategories && kb.selectedFAQCategories.length > 0) {
        prompt += `You have knowledge about: ${kb.selectedFAQCategories.join(', ')} topics.\n`;
      }
      if (kb.useBrandGuidelines) {
        prompt += 'Follow the established brand voice and communication guidelines.\n';
      }
      if (kb.customKnowledge) {
        prompt += `Additional context: ${kb.customKnowledge}\n`;
      }
    }

    // Behavior settings
    if (data.behaviorSettings) {
      const behavior = data.behaviorSettings;
      prompt += '\nCall handling instructions:\n';
      if (behavior.endCallOnGoodbye) {
        prompt += '- End calls when customer says goodbye or similar phrases\n';
      }
      if (behavior.voicemailDetection && behavior.voicemailMessage) {
        prompt += `- When voicemail is detected, leave this message: "${behavior.voicemailMessage}"\n`;
      }
      if (behavior.transferEnabled && behavior.transferNumbers && behavior.transferNumbers.length > 0) {
        prompt += '- Transfer calls to human agents when requested or when unable to help\n';
      }
      prompt += `- Wait ${behavior.silenceTimeoutSeconds} seconds for customer responses\n`;
      prompt += `- Make up to ${behavior.maxRetries} clarification attempts before escalating\n`;
    }

    return prompt;
  };

  const { checks, completed, total } = getCompletionStatus();
  const isComplete = completed === total;

  const voiceModels: Record<string, string> = {
    'eleven_turbo_v2_5': 'Turbo v2.5',
    'eleven_turbo_v2': 'Turbo v2',
    'eleven_flash_v2_5': 'Flash v2.5',
    'eleven_flash_v2': 'Flash v2'
  };

  const llmModels: Record<string, string> = {
    'gemini-2.0-flash': 'Gemini 2.0 Flash'
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Review Your Agent Configuration
        </h3>
        <p className="text-gray-600 mb-6">
          Review all settings before creating your agent. You can always modify these later.
        </p>
      </div>

      {/* Completion Status */}
      <div className={`border rounded-lg p-4 ${isComplete ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
        <div className="flex items-center gap-3 mb-3">
          {isComplete ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          <h4 className={`font-medium ${isComplete ? 'text-green-900' : 'text-yellow-900'}`}>
            Configuration Status: {completed}/{total} Complete
          </h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {checks.map((check, index) => (
            <div key={index} className={`text-sm flex items-center gap-1 ${
              check.complete ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {check.complete ? '✓' : '○'} {check.label}
            </div>
          ))}
        </div>
      </div>

      {/* Basic Information */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <User className="h-5 w-5 text-blue-600" />
          <h4 className="font-medium text-gray-900">Basic Information</h4>
        </div>
        <div className="ml-8 space-y-2 text-sm">
          <div><span className="font-medium">Name:</span> {data.name || 'Not set'}</div>
          <div><span className="font-medium">Description:</span> {data.description || 'Not set'}</div>
          <div><span className="font-medium">Purpose:</span> {data.purpose ? data.purpose.charAt(0).toUpperCase() + data.purpose.slice(1) : 'Not set'}</div>
        </div>
      </div>

      {/* Voice Configuration */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Mic className="h-5 w-5 text-green-600" />
          <h4 className="font-medium text-gray-900">Voice Configuration</h4>
        </div>
        <div className="ml-8 space-y-2 text-sm">
          <div><span className="font-medium">Voice:</span> {data.voiceConfig?.voiceName || 'Default'}</div>
          <div><span className="font-medium">Model:</span> {data.voiceConfig?.model ? voiceModels[data.voiceConfig.model] : 'Not set'}</div>
          <div><span className="font-medium">Settings:</span> Stability: {data.voiceConfig?.stability || 0.5}, Similarity: {data.voiceConfig?.similarity || 0.8}, Speed: {data.voiceConfig?.speed || 1.0}x</div>
        </div>
      </div>

      {/* Knowledge Base */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Database className="h-5 w-5 text-purple-600" />
          <h4 className="font-medium text-gray-900">Knowledge Base</h4>
        </div>
        <div className="ml-8 space-y-1 text-sm">
          {data.conversationConfig?.knowledgeBase ? (
            <>
              <div>Business Info: {data.conversationConfig.knowledgeBase.useBusinessInfo ? '✓ Enabled' : '○ Disabled'}</div>
              <div>Products: {data.conversationConfig.knowledgeBase.useProducts ? `✓ Enabled (${data.conversationConfig.knowledgeBase.selectedProductIds?.length || 0} selected)` : '○ Disabled'}</div>
              <div>FAQs: {data.conversationConfig.knowledgeBase.useFAQs ? `✓ Enabled (${data.conversationConfig.knowledgeBase.selectedFAQCategories?.length || 0} categories)` : '○ Disabled'}</div>
              <div>Brand Guidelines: {data.conversationConfig.knowledgeBase.useBrandGuidelines ? '✓ Enabled' : '○ Disabled'}</div>
              {data.conversationConfig.knowledgeBase.customKnowledge && (
                <div>Custom Knowledge: ✓ Added</div>
              )}
            </>
          ) : (
            <div className="text-gray-500">No knowledge base configured</div>
          )}
        </div>
      </div>

      {/* Conversation Settings */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <MessageSquare className="h-5 w-5 text-orange-600" />
          <h4 className="font-medium text-gray-900">Conversation Settings</h4>
        </div>
        <div className="ml-8 space-y-2 text-sm">
          <div><span className="font-medium">Opening Message:</span> "{data.conversationConfig?.firstMessage || 'Not set'}"</div>
          <div><span className="font-medium">Language:</span> {data.conversationConfig?.language || 'English'}</div>
          <div><span className="font-medium">AI Model:</span> {data.conversationConfig?.llmModel ? llmModels[data.conversationConfig.llmModel] : 'Not set'}</div>
          <div><span className="font-medium">Creativity:</span> {data.conversationConfig?.temperature || 0.7}/1.0</div>
          <div><span className="font-medium">Max Duration:</span> {data.conversationConfig?.maxDurationSeconds ? Math.floor(data.conversationConfig.maxDurationSeconds / 60) : 10} minutes</div>
        </div>
      </div>

      {/* Behavior Settings */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Settings className="h-5 w-5 text-red-600" />
          <h4 className="font-medium text-gray-900">Behavior Settings</h4>
        </div>
        <div className="ml-8 space-y-1 text-sm">
          <div>Auto-end calls: {data.behaviorSettings?.endCallOnGoodbye ? '✓ Enabled' : '○ Disabled'}</div>
          <div>Voicemail detection: {data.behaviorSettings?.voicemailDetection ? '✓ Enabled' : '○ Disabled'}</div>
          <div>Call transfer: {data.behaviorSettings?.transferEnabled ? `✓ Enabled (${data.behaviorSettings.transferNumbers?.length || 0} numbers)` : '○ Disabled'}</div>
          <div>Interruption sensitivity: {data.behaviorSettings?.interruptionSensitivity || 'Medium'}</div>
          <div>Silence timeout: {data.behaviorSettings?.silenceTimeoutSeconds || 30} seconds</div>
          <div>Max retries: {data.behaviorSettings?.maxRetries || 3}</div>
        </div>
      </div>

      {/* Generated Prompt Preview */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-gray-600" />
            <h4 className="font-medium text-gray-900">Generated Agent Instructions</h4>
          </div>
          <button
            onClick={() => setShowFullPrompt(!showFullPrompt)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showFullPrompt ? 'Hide' : 'Show'} Full Prompt
          </button>
        </div>
        
        {showFullPrompt ? (
          <div className="ml-8 bg-gray-50 border border-gray-200 rounded p-3 text-sm font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
            {generateFullPrompt()}
          </div>
        ) : (
          <div className="ml-8 text-sm text-gray-600">
            Click "Show Full Prompt" to see the complete instructions that will be sent to your agent
          </div>
        )}
      </div>

      {/* Final Validation */}
      {!isComplete && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h4 className="font-medium text-red-900">Configuration Incomplete</h4>
          </div>
          <p className="text-sm text-red-800">
            Please complete all required sections before creating your agent. Missing sections are marked with ○ above.
          </p>
        </div>
      )}

      {isComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-green-900">Ready to Create Agent</h4>
          </div>
          <p className="text-sm text-green-800">
            Your agent configuration is complete! Click "Create Agent" to deploy your new AI assistant.
          </p>
        </div>
      )}
    </div>
  );
}