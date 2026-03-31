export type ConfigSection = 'voice' | 'conversation' | 'knowledge' | 'tools' | 'channels' | 'webhooks';

export interface AgentConfiguration {
  id: string;
  name: string;
  description?: string;
  voice?: VoiceConfig;
  conversation?: ConversationConfig;
  knowledge?: KnowledgeConfig;
  tools?: ToolsConfig;
  channels?: ChannelsConfig;
}

export interface VoiceConfig {
  voiceId?: string;
  selectedVoiceName?: string;
  selectedVoiceDescription?: string;
  selectedVoiceCategory?: string;
  selectedVoiceLabels?: { [key: string]: string };
  selectedVoicePreviewUrl?: string;
  // Updated to match 11Labs structure
  speed?: number;
  stability?: number;
  similarity_boost?: number;
  optimize_streaming_latency?: number;
  model_id?: string;
  agent_output_audio_format?: string;
  // Legacy fields for backward compatibility
  pitch?: number;
  volume?: number;
  language?: string;
  voiceRecord?: {
    voiceId: string;
    voiceName: string;
    voiceDescription: string;
    voiceCategory: string;
    voiceLabels: { [key: string]: string };
    voicePreviewUrl: string;
    voiceSettings: {
      stability?: number;
      speed?: number;
      similarity_boost?: number;
    };
    selectedAt: string;
    updatedAt: string;
  };
  // Advanced voice settings
  supportedVoices?: any[];
  pronunciationDictionaries?: any[];
}

export interface ConversationConfig {
  // Agent/LLM Settings
  language?: string;
  first_message?: string;
  llm?: string;
  temperature?: number;
  max_tokens?: number;
  prompt?: string;
  timezone?: string;
  ignore_default_personality?: boolean;
  
  // ASR Settings
  asr?: {
    provider?: string;
    quality?: string;
    user_input_audio_format?: string;
    keywords?: string[];
  };
  
  // Turn Handling
  turn?: {
    mode?: string;
    turn_timeout?: number;
    silence_end_call_timeout?: number;
  };
  
  // Conversation Settings
  conversation?: {
    text_only?: boolean;
    max_duration_seconds?: number;
    client_events?: string[];
  };
  
  // Tools & Integrations
  toolIds?: string[];
  builtInTools?: any;
  customTools?: any[];
  knowledgeBase?: any[];
  ragSettings?: {
    enabled?: boolean;
    embedding_model?: string;
    max_vector_distance?: number;
    max_documents_length?: number;
    max_retrieved_rag_chunks_count?: number;
  };
  mcpServerIds?: string[];
  nativeMcpServerIds?: string[];
}

export interface KnowledgeConfig {
  documents?: Document[];
  selectedDocuments?: import('@/lib/api/kbDocuments').KBDocument[];
  maxTokens?: number;
  sources?: string[];
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface ToolsConfig {
  enabledTools?: string[];
  apiKeys?: Record<string, string>;
  customTools?: CustomTool[];
}

export interface CustomTool {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
}

export interface ChannelsConfig {
  phone?: PhoneConfig;
  sms?: SmsConfig;
  email?: EmailConfig;
  webhook?: WebhookConfig;
}

export interface PhoneConfig {
  phoneNumber?: string;
  provider?: string;
  twilioSid?: string;
  enabled: boolean;
}

export interface SmsConfig {
  phoneNumber?: string;
  provider?: string;
  enabled: boolean;
}

export interface EmailConfig {
  email?: string;
  emailId?: string;
  enabled: boolean;
}

export interface WebhookConfig {
  url?: string;
  secret?: string;
  enabled: boolean;
}

export interface ConfigurationSectionProps {
  agentId: string;
  config: AgentConfiguration;
  onUpdate: (updates: Partial<AgentConfiguration>) => void;
}