'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Clock, Brain, Thermometer, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { CallAgentRequest, PromptGenerationRequest } from '@/types';
import { promptGenerationApi } from '../../../lib/api/promptGeneration';

interface StepConversationConfigProps {
  data: Partial<CallAgentRequest>;
  onUpdate: (data: Partial<CallAgentRequest>) => void;
}

export default function StepConversationConfig({ data, onUpdate }: StepConversationConfigProps) {
  // Generate system prompt function (defined early so it can be used in useEffect)
  const generateSystemPrompt = () => {
    if (!data.name || !data.description || !data.purpose) return '';

    let prompt = `You are ${data.name}, an AI assistant specialized in ${data.purpose}. `;
    prompt += `${data.description} `;
    
    // Add knowledge base context
    if (data.conversationConfig?.knowledgeBase) {
      const kb = data.conversationConfig.knowledgeBase;
      
      if (kb.useBusinessInfo) {
        prompt += 'You have access to complete business information including company details, mission, and contact information. ';
      }
      
      if (kb.useProducts && kb.selectedProductIds && kb.selectedProductIds.length > 0) {
        prompt += `You can help customers with ${kb.selectedProductIds.length} products/services from our catalog. `;
      }
      
      if (kb.useFAQs && kb.selectedFAQCategories && kb.selectedFAQCategories.length > 0) {
        prompt += `You have knowledge about these topics: ${kb.selectedFAQCategories.join(', ')}. `;
      }
      
      if (kb.useBrandGuidelines) {
        prompt += 'Follow the established brand voice and communication guidelines. ';
      }
      
      if (kb.customKnowledge) {
        prompt += `Additional context: ${kb.customKnowledge} `;
      }
    }
    
    switch (data.purpose) {
      case 'sales':
        prompt += 'Your primary goal is to understand customer needs, present solutions, and guide them toward making a purchase decision. Be persuasive but not pushy. ';
        break;
      case 'support':
        prompt += 'Your primary goal is to help customers resolve their issues quickly and effectively. Be patient, empathetic, and solution-focused. ';
        break;
      case 'appointment':
        prompt += 'Your primary goal is to understand the customer\'s needs and schedule appropriate appointments. Be efficient and accommodating with scheduling. ';
        break;
      case 'general':
        prompt += 'Your primary goal is to gather relevant information from customers and qualify their needs. Ask thoughtful questions and listen carefully. ';
        break;
      default:
        prompt += 'Your primary goal is to provide excellent customer service and achieve the outcomes defined for your role. ';
    }

    prompt += 'Always be professional, helpful, and maintain a positive conversation flow. ';
    prompt += 'If you cannot help with something, politely explain and offer alternatives when possible.';

    return prompt;
  };

  const [conversationSettings, setConversationSettings] = useState({
    firstMessage: data.conversationConfig?.firstMessage || 'Hello! Thank you for calling. How can I help you today?',
    systemPrompt: data.conversationConfig?.systemPrompt || '',
    language: data.conversationConfig?.language || 'en',
    maxDurationSeconds: data.conversationConfig?.maxDurationSeconds || 600,
    llmModel: data.conversationConfig?.llmModel || 'gemini-2.0-flash' as const,
    temperature: data.conversationConfig?.temperature || 0.7
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingFirstMessage, setIsGeneratingFirstMessage] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<any>(null);
  const [showConversationFlow, setShowConversationFlow] = useState(false);

  // Auto-generate system prompt if it's empty and we have the required data
  useEffect(() => {
    if (!conversationSettings.systemPrompt && data.name && data.description && data.purpose) {
      const generatedPrompt = generateSystemPrompt();
      if (generatedPrompt) {
        setConversationSettings(prev => ({ ...prev, systemPrompt: generatedPrompt }));
      }
    }
  }, [data.name, data.description, data.purpose, data.conversationConfig?.knowledgeBase]);

  useEffect(() => {
    onUpdate({
      conversationConfig: {
        ...data.conversationConfig,
        ...conversationSettings,
        knowledgeBase: data.conversationConfig?.knowledgeBase || {
          useBusinessInfo: false,
          useProducts: false,
          selectedProductIds: [],
          useFAQs: false,
          selectedFAQCategories: [],
          useBrandGuidelines: false,
          elevenlabsKnowledgeBases: []
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationSettings]);

  const updateSetting = (setting: string, value: any) => {
    setConversationSettings(prev => ({ ...prev, [setting]: value }));
  };

  // Generate AI-powered prompt and first message
  const generateAIPrompt = async () => {
    if (!data.name || !data.description || !data.purpose) {
      alert('Please complete the basic information first');
      return;
    }

    setIsGenerating(true);
    
    try {
      const request: PromptGenerationRequest = {
        agentName: data.name,
        description: data.description,
        purpose: data.purpose,
        businessGoals: data.businessGoals,
        targetAudience: data.targetAudience,
        keyChallenges: data.keyChallenges,
        successMetrics: data.successMetrics,
        conversationStyle: data.conversationStyle,
        industryContext: data.industryContext,
        knowledgeBase: data.conversationConfig?.knowledgeBase
      };

      const response = await promptGenerationApi.generateAgentPrompt(request);
      
      if (response.success) {
        setConversationSettings(prev => ({
          ...prev,
          systemPrompt: response.data.systemPrompt,
          firstMessage: response.data.firstMessage
        }));
        
        setLastGenerated(response.data);
        setShowConversationFlow(true);
      }
    } catch (error) {
      console.error('Failed to generate AI prompt:', error);
      alert('Failed to generate AI prompt. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate just the first message
  const generateFirstMessage = async () => {
    if (!data.name || !data.description || !data.purpose) {
      alert('Please complete the basic information first');
      return;
    }

    setIsGeneratingFirstMessage(true);
    
    try {
      const request: PromptGenerationRequest = {
        agentName: data.name,
        description: data.description,
        purpose: data.purpose,
        businessGoals: data.businessGoals,
        targetAudience: data.targetAudience,
        conversationStyle: data.conversationStyle,
        knowledgeBase: data.conversationConfig?.knowledgeBase
      };

      const response = await promptGenerationApi.generateFirstMessage(request);
      
      if (response.success) {
        setConversationSettings(prev => ({
          ...prev,
          firstMessage: response.data.firstMessage
        }));
      }
    } catch (error) {
      console.error('Failed to generate first message:', error);
      alert('Failed to generate first message. Please try again.');
    } finally {
      setIsGeneratingFirstMessage(false);
    }
  };


  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'nl', label: 'Dutch' },
    { value: 'pl', label: 'Polish' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' }
  ];

  const firstMessageTemplates = [
    'Hello! Thank you for calling. How can I help you today?',
    'Hi there! I\'m here to assist you. What can I do for you?',
    'Good [morning/afternoon/evening]! Thanks for reaching out. How may I help?',
    'Hello! I\'m excited to speak with you today. What brings you to call?',
    'Hi! Thank you for your interest in our services. How can I assist you today?'
  ];


  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Configure Conversation Settings
        </h3>
        <p className="text-gray-600 mb-6">
          Set up how your agent communicates and behaves during conversations.
        </p>
      </div>

      {/* AI-Powered Prompt Generation */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI-Powered Prompt Generation
        </h4>
        <p className="text-sm text-purple-800 mb-4">
          Let our AI create a personalized system prompt and opening message based on your agent's context and goals.
        </p>
        <div className="flex gap-3">
          <button
            onClick={generateAIPrompt}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Complete Prompt'}
          </button>
          <button
            onClick={generateFirstMessage}
            disabled={isGeneratingFirstMessage}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            {isGeneratingFirstMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {isGeneratingFirstMessage ? 'Generating...' : 'Generate Opening Only'}
          </button>
        </div>
      </div>

      {/* First Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MessageSquare className="inline h-4 w-4 mr-1" />
          Opening Message
        </label>
        <textarea
          value={conversationSettings.firstMessage}
          onChange={(e) => updateSetting('firstMessage', e.target.value)}
          placeholder="What your agent says when the call begins..."
          rows={3}
          className="input min-h-[80px] mb-2"
        />
        <div className="mb-3">
          <p className="text-sm text-gray-600 mb-2">Quick templates:</p>
          <div className="flex flex-wrap gap-2">
            {firstMessageTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => updateSetting('firstMessage', template)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
              >
                Template {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Language Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Language
        </label>
        <select
          value={conversationSettings.language}
          onChange={(e) => updateSetting('language', e.target.value)}
          className="input w-full md:w-1/2"
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          The primary language for conversations. Your agent can often understand multiple languages regardless of this setting.
        </p>
      </div>

      {/* AI Model Info (Fixed to Gemini 2.0 Flash) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Brain className="inline h-4 w-4 mr-1" />
          AI Model
        </label>
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-900">Gemini 2.0 Flash</span>
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
              Optimized
            </span>
          </div>
          <p className="text-sm text-blue-800">
            Ultra-fast, extremely cost-effective, and optimized for real-time conversations
          </p>
        </div>
      </div>

      {/* Temperature Setting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Thermometer className="inline h-4 w-4 mr-1" />
          Creativity Level (Temperature)
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={conversationSettings.temperature}
            onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Focused (0.0)</span>
            <span className="font-medium">{conversationSettings.temperature}</span>
            <span>Creative (1.0)</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Lower values make responses more consistent and predictable. Higher values add creativity and variation.
        </p>
      </div>

      {/* Max Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Clock className="inline h-4 w-4 mr-1" />
          Maximum Call Duration
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="60"
            max="1800"
            step="60"
            value={conversationSettings.maxDurationSeconds}
            onChange={(e) => updateSetting('maxDurationSeconds', parseInt(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <span className="text-sm font-medium text-gray-900 min-w-[80px]">
            {Math.floor(conversationSettings.maxDurationSeconds / 60)} minutes
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Calls will automatically end after this duration to prevent runaway costs
        </p>
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          System Instructions
        </label>
        <textarea
          value={conversationSettings.systemPrompt || generateSystemPrompt()}
          onChange={(e) => updateSetting('systemPrompt', e.target.value)}
          placeholder="The core instructions that guide your agent's behavior..."
          rows={6}
          className="input min-h-[150px]"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-gray-500">
            These instructions tell your agent how to behave and what its goals are
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => updateSetting('systemPrompt', generateSystemPrompt())}
              className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Use Template
            </button>
            <button
              onClick={generateAIPrompt}
              disabled={isGenerating}
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              {isGenerating ? 'Generating...' : 'Generate with AI'}
            </button>
          </div>
        </div>
      </div>

      {/* Conversation Flow Preview */}
      {lastGenerated && showConversationFlow && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-green-900">✨ AI-Generated Conversation Strategy</h4>
            <button
              onClick={() => setShowConversationFlow(false)}
              className="text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-green-800">Opening:</span>
              <p className="text-green-700 ml-2">{lastGenerated.conversationFlow.opening}</p>
            </div>
            
            <div>
              <span className="font-medium text-green-800">Discovery Questions:</span>
              <ul className="text-green-700 ml-2 list-disc list-inside">
                {lastGenerated.conversationFlow.discovery.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <span className="font-medium text-green-800">Key Phrases to Use:</span>
              <div className="flex flex-wrap gap-1 ml-2">
                {lastGenerated.keyPhrases.map((phrase: string, idx: number) => (
                  <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
            
            {lastGenerated.successTips.length > 0 && (
              <div>
                <span className="font-medium text-green-800">Success Tips:</span>
                <ul className="text-green-700 ml-2 list-disc list-inside">
                  {lastGenerated.successTips.map((tip: string, idx: number) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Conversation Preview</h4>
        <div className="space-y-2 text-sm">
          <div className="bg-blue-100 text-blue-900 p-2 rounded">
            <strong>Agent:</strong> {conversationSettings.firstMessage}
          </div>
          <div className="bg-gray-100 text-gray-700 p-2 rounded">
            <strong>Customer:</strong> Hi, I'm interested in learning more about your services.
          </div>
          <div className="bg-blue-100 text-blue-900 p-2 rounded">
            <strong>Agent:</strong> Great! I'd be happy to help you learn about our services. What specific area are you most interested in, and what's your current situation?
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Model: Gemini 2.0 Flash | 
          Temperature: {conversationSettings.temperature} | 
          Max Duration: {Math.floor(conversationSettings.maxDurationSeconds / 60)} min
        </p>
      </div>
    </div>
  );
}