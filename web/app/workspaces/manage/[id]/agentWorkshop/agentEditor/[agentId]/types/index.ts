/**
 * Agent Editor Types
 *
 * Comprehensive type definitions for the agent editor.
 * Maps to Firestore agent document structure.
 */

// ============================================
// VOICE & TTS CONFIGURATION
// ============================================
export interface VoiceSettings {
  voiceId?: string;
  voiceName?: string;
  voiceDescription?: string;
  voiceCategory?: string;
  voicePreviewUrl?: string;
  stability?: number;
  speed?: number;
  similarity_boost?: number;
  optimize_streaming_latency?: number;
  model_id?: string;
  agent_output_audio_format?: string;
}

export interface VoiceRecord {
  voiceId?: string;
  voiceName?: string;
  voiceDescription?: string;
  voiceCategory?: string;
  voicePreviewUrl?: string;
  voiceLabels?: Record<string, any>;
}

// ============================================
// ASR (SPEECH RECOGNITION) CONFIGURATION
// ============================================
export interface ASRSettings {
  provider?: string;
  quality?: string;
  user_input_audio_format?: string;
  keywords?: string[];
}

// ============================================
// TURN HANDLING CONFIGURATION
// ============================================
export interface TurnSettings {
  mode?: string;
  turn_timeout?: number;
  silence_end_call_timeout?: number;
}

// ============================================
// CONVERSATION CONFIGURATION
// ============================================
export interface ConversationSettings {
  text_only?: boolean;
  max_duration_seconds?: number;
  client_events?: string[];
}

// ============================================
// AGENT/LLM CONFIGURATION
// ============================================
export interface AgentSettings {
  language?: string;
  first_message?: string;
  dynamic_variables?: Record<string, any>;
}

export interface LLMSettings {
  llm?: string;
  temperature?: number;
  max_tokens?: number;
  prompt?: string;
  timezone?: string;
  ignore_default_personality?: boolean;
}

// ============================================
// RAG CONFIGURATION
// ============================================
export interface RAGSettings {
  enabled?: boolean;
  embedding_model?: string;
  max_vector_distance?: number;
  max_documents_length?: number;
  max_retrieved_rag_chunks_count?: number;
}

// ============================================
// KNOWLEDGE BASE
// ============================================
export interface KnowledgeBaseDocument {
  elevenLabsDocId: string;
  elevenLabsDocName: string;
  elevenLabsDocType: 'text' | 'file' | 'url';
  internalDocumentId: string | null;
  internalDocumentTitle: string;
  attachedAt: string;
}

// ============================================
// TOOLS CONFIGURATION
// ============================================
export interface BuiltInTool {
  name: string;
  description: string;
}

export interface CustomTool {
  id: string;
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

// ============================================
// CHANNELS CONFIGURATION
// ============================================
export interface ChannelConfig {
  enabled: boolean;
}

export interface PhoneChannel extends ChannelConfig {
  phoneNumber?: string;
  phoneNumberSid?: string;
}

export interface EmailChannel extends ChannelConfig {
  email?: string;
  emailId?: string;
}

export interface PhoneChannelExtended extends PhoneChannel {
  inboundEnabled?: boolean;
  outboundEnabled?: boolean;
}

export interface ChannelsConfig {
  voice?: PhoneChannel;
  phone?: PhoneChannelExtended;
  sms?: ChannelConfig;
  email?: EmailChannel;
  webhook?: ChannelConfig;
}

// ============================================
// WEBHOOK CONFIGURATION
// ============================================
export interface WebhookConfig {
  url?: string;
  events?: string[];
  secret?: string;
}

export interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
}

// ============================================
// PLATFORM SETTINGS
// ============================================
export interface PlatformSettings {
  auth?: any;
  evaluation?: any;
  widget?: any;
  data_collection?: any;
  overrides?: any;
  call_limits?: any;
  ban?: any;
  privacy?: any;
  workspace_overrides?: any;
  testing?: any;
  safety?: any;
  webhookUrl?: string;
}

// ============================================
// MAIN AGENT TYPE
// ============================================
export interface Agent {
  id: string;
  name: string;
  description?: string;
  status?: 'draft' | 'active' | 'paused';

  // 11Labs Integration
  elevenLabsAgentId?: string;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  lastRefreshedAt?: any;

  // Bot Avatar
  botAvatarColor?: string;
  botEntityImagePath?: string;
  botIconImagePath?: string;

  // Voice/TTS
  currentVoiceId?: string;
  voiceSettings?: VoiceSettings;
  voiceRecord?: VoiceRecord;
  supportedVoices?: any[];
  pronunciationDictionaries?: any[];

  // ASR
  asrSettings?: ASRSettings;

  // Turn Handling
  turnSettings?: TurnSettings;

  // Conversation
  conversationSettings?: ConversationSettings;

  // Agent/LLM
  agentSettings?: AgentSettings;
  llmSettings?: LLMSettings;
  prompt?: string;

  // Tools
  toolIds?: string[];
  builtInTools?: Record<string, BuiltInTool>;
  customTools?: CustomTool[];

  // Knowledge Base
  knowledgeBase?: any[];
  knowledgeBaseDocuments?: KnowledgeBaseDocument[];
  ragSettings?: RAGSettings;
  lastKnowledgeBaseUpdate?: string;

  // MCP Servers
  mcpServerIds?: string[];
  nativeMcpServerIds?: string[];

  // Channels
  channels?: ChannelsConfig;
  agentPhoneNumber?: string;
  agentPhoneNumberSid?: string;
  agentEmail?: string;
  agentEmailId?: string;

  // Platform
  platformSettings?: PlatformSettings;

  // Webhooks
  webhooks?: WebhookEntry[];

  // 11Labs Metadata
  elevenLabsPhoneNumbers?: any[];
  elevenLabsMetadata?: any;
  elevenLabsTags?: string[];
  elevenLabsFullConfig?: any;
}

// ============================================
// CHAT TYPES
// ============================================
export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  metadata?: {
    action?: string;
    changes?: Record<string, any>;
  };
}

// ============================================
// CONFIG SECTION TYPES
// ============================================
export type ConfigSection =
  | 'basic'
  | 'voice'
  | 'conversation'
  | 'knowledge'
  | 'tools'
  | 'channels'
  | 'webhooks';

// ============================================
// DROPDOWN OPTIONS
// ============================================
export const LLM_OPTIONS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
] as const;

export const TTS_MODEL_OPTIONS = [
  { value: 'eleven_turbo_v2_5', label: 'Eleven Turbo v2.5 (Recommended)' },
  { value: 'eleven_flash_v2_5', label: 'Eleven Flash v2.5' },
  { value: 'eleven_turbo_v2', label: 'Eleven Turbo v2 (English Only)' },
  { value: 'eleven_flash_v2', label: 'Eleven Flash v2 (English Only)' },
] as const;

export const AUDIO_FORMAT_OPTIONS = [
  { value: 'pcm_8000', label: 'PCM 8kHz (Telephony)' },
  { value: 'pcm_16000', label: 'PCM 16kHz (High Quality)' },
  { value: 'pcm_22050', label: 'PCM 22kHz' },
  { value: 'pcm_44100', label: 'PCM 44kHz' },
] as const;

export const ASR_QUALITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const;

export const TURN_MODE_OPTIONS = [
  { value: 'silence', label: 'Silence Detection' },
  { value: 'turn', label: 'Turn Based' },
] as const;
