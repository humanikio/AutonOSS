// Action Creation Types

export type CreationMode = 'chat' | 'direct-prompt';
export type CreationStep = 'describe' | 'refine' | 'finalize';
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface ActionUnderstanding {
  summary: string;
  behavior: string;
  tone: string;
  keyPoints: string[];
  confidence: number;
  missingContext?: string[];
}

export interface ActionConfiguration {
  id?: string;
  name: string;
  description: string;
  type: 'nurture' | 'support' | 'followup' | 'custom';
  prompt: string;
  understanding: ActionUnderstanding;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActionCreationState {
  // Mode control
  mode: CreationMode;
  
  // Chat history
  messages: ChatMessage[];
  isLLMTyping: boolean;
  
  // Current action data
  userDescription: string;
  currentPrompt: string;
  aiUnderstanding: ActionUnderstanding | null;
  needsMoreContext: boolean;
  clarifyingQuestion?: string;
  
  // Creation flow
  step: CreationStep;
  canProceed: boolean;
  forceProceed: boolean;
  
  // Final action
  finalAction?: ActionConfiguration;
}

export interface ActionCreationChatProps {
  agentId: string;
  sessionId?: string;
  onActionCreated?: (action: ActionConfiguration) => void;
  mode?: 'embedded' | 'modal' | 'fullscreen';
  className?: string;
}