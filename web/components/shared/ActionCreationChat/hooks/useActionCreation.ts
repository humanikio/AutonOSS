'use client';

import { useState, useCallback } from 'react';
import { 
  ActionCreationState, 
  ChatMessage, 
  ActionUnderstanding, 
  ActionConfiguration,
  CreationMode,
  CreationStep 
} from '../types/actionCreation';

// Mock LLM analysis function
const mockAnalyzeDescription = async (description: string): Promise<{
  understanding: ActionUnderstanding;
  needsMoreContext: boolean;
  clarifyingQuestion?: string;
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock analysis results
  const mockUnderstanding: ActionUnderstanding = {
    summary: `Based on your description, this action will create an agent that ${description.toLowerCase()}. The agent will be configured to respond appropriately to user interactions.`,
    behavior: `Professional and helpful, focusing on ${description.includes('support') ? 'problem-solving and assistance' : 'user engagement and guidance'}`,
    tone: description.includes('friendly') || description.includes('casual') ? 'Friendly and approachable' : 'Professional and courteous',
    keyPoints: [
      'Responds to user queries effectively',
      'Maintains consistent personality',
      'Follows specified guidelines',
      ...(description.includes('email') ? ['Handles email format properly'] : []),
      ...(description.includes('sms') ? ['Keeps messages concise for SMS'] : [])
    ],
    confidence: 0.75,
    missingContext: description.length < 50 ? ['More detail about specific behaviors needed', 'Clarification on response style'] : []
  };

  const needsMoreContext = description.length < 30 || mockUnderstanding.confidence < 0.8;
  const clarifyingQuestion = needsMoreContext ? 
    "Could you provide more details about what specific responses you'd like the agent to give?" : 
    undefined;

  return {
    understanding: mockUnderstanding,
    needsMoreContext,
    clarifyingQuestion
  };
};

export function useActionCreation(agentId: string) {
  const [state, setState] = useState<ActionCreationState>({
    mode: 'chat',
    messages: [],
    isLLMTyping: false,
    userDescription: '',
    currentPrompt: '',
    aiUnderstanding: null,
    needsMoreContext: false,
    step: 'describe',
    canProceed: false,
    forceProceed: false,
  });

  // Generate unique message ID
  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Switch creation mode
  const switchMode = useCallback((mode: CreationMode) => {
    setState(prev => ({ ...prev, mode }));
  }, []);

  // Add message to chat
  const addMessage = useCallback((content: string, role: 'user' | 'assistant') => {
    const message: ChatMessage = {
      id: generateMessageId(),
      role,
      content,
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }));

    return message.id;
  }, []);

  // Handle user message in chat mode
  const handleUserMessage = useCallback(async (message: string) => {
    // Add user message
    addMessage(message, 'user');

    // Update user description
    setState(prev => ({ 
      ...prev, 
      userDescription: prev.userDescription ? `${prev.userDescription} ${message}` : message,
      isLLMTyping: true 
    }));

    try {
      // Analyze with mock LLM
      const analysisResult = await mockAnalyzeDescription(message);
      
      // Add AI response
      const aiResponse = `I understand you want ${message.toLowerCase()}. Let me analyze this for you.`;
      addMessage(aiResponse, 'assistant');

      // Update understanding
      setState(prev => ({
        ...prev,
        aiUnderstanding: analysisResult.understanding,
        needsMoreContext: analysisResult.needsMoreContext,
        clarifyingQuestion: analysisResult.clarifyingQuestion,
        canProceed: !analysisResult.needsMoreContext || prev.forceProceed,
        isLLMTyping: false
      }));

      // Add clarifying question if needed
      if (analysisResult.needsMoreContext && analysisResult.clarifyingQuestion) {
        setTimeout(() => {
          addMessage(analysisResult.clarifyingQuestion!, 'assistant');
        }, 500);
      }

    } catch (error) {
      console.error('Error analyzing message:', error);
      setState(prev => ({ ...prev, isLLMTyping: false }));
    }
  }, [addMessage]);

  // Handle direct prompt analysis
  const handlePromptAnalysis = useCallback(async (prompt: string) => {
    setState(prev => ({ ...prev, currentPrompt: prompt, isLLMTyping: true }));

    try {
      const analysisResult = await mockAnalyzeDescription(prompt);
      
      setState(prev => ({
        ...prev,
        aiUnderstanding: analysisResult.understanding,
        needsMoreContext: analysisResult.needsMoreContext,
        clarifyingQuestion: analysisResult.clarifyingQuestion,
        canProceed: !analysisResult.needsMoreContext || prev.forceProceed,
        isLLMTyping: false
      }));

    } catch (error) {
      console.error('Error analyzing prompt:', error);
      setState(prev => ({ ...prev, isLLMTyping: false }));
    }
  }, []);

  // Toggle force proceed
  const toggleForceProceed = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      forceProceed: enabled,
      canProceed: enabled || !prev.needsMoreContext
    }));
  }, []);

  // Navigate steps
  const goToStep = useCallback((step: CreationStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  // Continue to next step
  const continueToNextStep = useCallback(() => {
    setState(prev => {
      const nextStep: CreationStep = 
        prev.step === 'describe' ? 'refine' : 
        prev.step === 'refine' ? 'finalize' : 'finalize';
      
      return { ...prev, step: nextStep };
    });
  }, []);

  // Create final action
  const createAction = useCallback(async (): Promise<ActionConfiguration | null> => {
    if (!state.aiUnderstanding) return null;

    setState(prev => ({ ...prev, isLLMTyping: true }));

    // Mock action creation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const finalAction: ActionConfiguration = {
      id: `action_${Date.now()}`,
      name: state.aiUnderstanding.summary.substring(0, 50) + '...',
      description: state.aiUnderstanding.summary,
      type: 'custom',
      prompt: state.currentPrompt || `You are an AI agent that ${state.userDescription}. ${state.aiUnderstanding.behavior}`,
      understanding: state.aiUnderstanding,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setState(prev => ({
      ...prev,
      finalAction,
      step: 'finalize',
      isLLMTyping: false
    }));

    return finalAction;
  }, [state.aiUnderstanding, state.currentPrompt, state.userDescription]);

  // Reset state
  const resetCreation = useCallback(() => {
    setState({
      mode: 'chat',
      messages: [],
      isLLMTyping: false,
      userDescription: '',
      currentPrompt: '',
      aiUnderstanding: null,
      needsMoreContext: false,
      step: 'describe',
      canProceed: false,
      forceProceed: false,
    });
  }, []);

  return {
    state,
    actions: {
      switchMode,
      handleUserMessage,
      handlePromptAnalysis,
      toggleForceProceed,
      goToStep,
      continueToNextStep,
      createAction,
      resetCreation
    }
  };
}