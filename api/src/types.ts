// Shared types for frontend and backend

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  companyName?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    tenant: Tenant;
    token: string;
  };
  error?: string;
  message?: string;
  timestamp: string;
}

// User types
export interface User {
  uid: string;
  email: string;
  name: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'user';
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  
  // NEW: Multi-tenant support
  accessibleTenants?: string[];  // Array of tenant IDs user can access
  selectedTenant?: string;       // Current selected tenant ID
  status?: 'active' | 'suspended' | 'removed';
  suspendedAt?: string;
  removedAt?: string;
  removedBy?: string;
  
  // Onboarding tracking
  onboardingCompleted?: boolean;  // Default: false - track if user has completed onboarding flow
  invitedUserOnboardingComplete?: boolean;  // Default: false - track if invited user has completed profile setup
}

// Tenant types
export interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: 'active' | 'suspended' | 'inactive';
  createdAt: string;
  updatedAt: string;
  settings: TenantSettings;
  usage: TenantUsage;
  profile?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  
  // NEW: Subaccount support
  isSubAccount?: boolean;        // true if this is a subaccount
  parentTenantId?: string;       // Links back to parent tenant (for subaccounts)
}

export interface TenantSettings {
  webhooks: Record<string, any>;
  apiKeys: Record<string, any>;
  branding: {
    companyName: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  features: {
    smsEnabled: boolean;
    callsEnabled: boolean;
    maxAgents: number;
    maxContacts: number;
  };
}

export interface TenantUsage {
  smsCount: number;
  callMinutes: number;
  agentCount: number;
  contactCount: number;
  lastReset: string;
}

// JWT payload
export interface JWTPayload {
  uid: string;
  tenantId: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

// API Response wrapper
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Alias for backward compatibility
export type ApiResponse<T = any> = APIResponse<T>;

// Knowledge Base Types

// Business Info types
export interface BusinessInfo {
  id: string;
  tenantId: string;
  companyName: string;
  description: string;
  industry: string;
  mission?: string;
  foundedYear?: number;
  website?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  businessHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BusinessInfoRequest {
  companyName: string;
  description: string;
  industry: string;
  mission?: string;
  foundedYear?: number;
  website?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  businessHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
}

// Product types
export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price?: number;
  pricingModel: 'one-time' | 'subscription' | 'usage-based' | 'free';
  pricingDetails?: string;
  category: 'product' | 'service';
  features: string[];
  availability?: 'available' | 'discontinued' | 'coming-soon';
  createdAt: string;
  updatedAt: string;
}

export interface ProductRequest {
  name: string;
  description: string;
  price?: number;
  pricingModel: 'one-time' | 'subscription' | 'usage-based' | 'free';
  pricingDetails?: string;
  category: 'product' | 'service';
  features: string[];
  availability?: 'available' | 'discontinued' | 'coming-soon';
}

// FAQ types
export interface FAQ {
  id: string;
  tenantId: string;
  question: string;
  answer: string;
  category: string;
  priority: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FAQRequest {
  question: string;
  answer: string;
  category: string;
  priority: number;
  tags?: string[];
}

// Brand Guidelines types
export interface BrandGuidelines {
  id: string;
  tenantId: string;
  brandName: string;
  brandDescription?: string;
  voice?: string;
  tone?: string;
  keyValues?: string[];
  communicationGuidelines?: string;
  doNots?: string[];
  brandValues?: string[];
  toneOfVoice?: {
    personality: string[];
    dosList: string[];
    dontsList: string[];
  };
  visualIdentity?: {
    logo?: string;
    primaryColors?: string[];
    secondaryColors?: string[];
    fonts?: string[];
  };
  messagingGuidelines?: string;
  targetAudience?: string;
  brandPositioning?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandGuidelinesRequest {
  brandName: string;
  brandDescription?: string;
  voice?: string;
  tone?: string;
  keyValues?: string[];
  communicationGuidelines?: string;
  doNots?: string[];
  brandValues?: string[];
  toneOfVoice?: {
    personality: string[];
    dosList: string[];
    dontsList: string[];
  };
  visualIdentity?: {
    logo?: string;
    primaryColors?: string[];
    secondaryColors?: string[];
    fonts?: string[];
  };
  messagingGuidelines?: string;
  targetAudience?: string;
  brandPositioning?: string;
}

// Call Agent Types

export interface KnowledgeBaseMappings {
  businessInfoId?: string;
  productIds?: Record<string, string>;
  faqCategoryIds?: Record<string, string>;
  brandGuidelinesId?: string;
}

export interface KnowledgeSyncStatus {
  lastSyncAt?: string;
  businessInfoVersion?: string;
  productsVersion?: string;
  faqsVersion?: string;
  brandGuidelinesVersion?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncError?: string;
}

export interface VoiceConfig {
  voiceId: string;
  voiceName?: string;
  model: string;
  stability: number;
  similarity: number;
  speed: number;
  optimizeLatency?: boolean;
}

export interface CustomKnowledgeBase {
  type: 'text' | 'url';
  name: string;
  content?: string;
  url?: string;
  elevenlabsId?: string;
}

export interface KnowledgeBase {
  useBusinessInfo: boolean;
  useProducts: boolean;
  selectedProductIds: string[];
  useFAQs: boolean;
  selectedFAQCategories: string[];
  useBrandGuidelines: boolean;
  customKnowledge?: string;
  elevenlabsKnowledgeBases: ElevenLabsKnowledgeBase[];
  customKnowledgeBases?: CustomKnowledgeBase[];
}

export interface ConversationConfig {
  firstMessage: string;
  systemPrompt: string;
  language: string;
  maxDurationSeconds: number;
  llmModel: string;
  temperature: number;
  knowledgeBase: KnowledgeBase;
}

export interface SystemTools {
  endCall: boolean;
  detectLanguage: boolean;
  skipTurn: boolean;
  transferToAgent: boolean;
  transferToNumber: boolean;
  playKeypardTouchTone: boolean;
  voicemailDetection: boolean;
}

export interface BehaviorSettings {
  systemTools: SystemTools;
  customToolIds: string[];
  endCallOnGoodbye: boolean;
  voicemailDetection: boolean;
  voicemailMessage?: string;
  transferEnabled: boolean;
  transferNumbers: string[];
  interruptionSensitivity: 'low' | 'medium' | 'high';
  silenceTimeoutSeconds?: number;
  maxRetries?: number;
}

export interface CallAgent {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived' | 'error';
  purpose: 'sales' | 'support' | 'general' | 'appointment' | 'survey';
  voiceConfig: VoiceConfig;
  conversationConfig: ConversationConfig;
  behaviorSettings: BehaviorSettings;
  businessGoals?: string;
  targetAudience?: string;
  keyChallenges?: string;
  successMetrics?: string;
  conversationStyle?: 'professional' | 'friendly' | 'casual' | 'formal';
  industryContext?: string;
  elevenlabsAgentId?: string;
  phoneNumber?: string;
  knowledgeBaseMappings?: KnowledgeBaseMappings;
  knowledgeSync?: KnowledgeSyncStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

export interface CallAgentRequest {
  name: string;
  description: string;
  purpose: 'sales' | 'support' | 'general' | 'appointment' | 'survey';
  voiceConfig?: Partial<VoiceConfig>;
  conversationConfig?: Partial<ConversationConfig>;
  behaviorSettings?: Partial<BehaviorSettings>;
  businessGoals?: string;
  targetAudience?: string;
  keyChallenges?: string;
  successMetrics?: string;
  conversationStyle?: 'professional' | 'friendly' | 'casual' | 'formal';
  industryContext?: string;
}

export interface AgentCreationStep {
  step: number;
  title: string;
  description: string;
  isComplete: boolean;
  data: Record<string, any>;
}

export interface PromptGenerationRequest {
  agentName: string;
  description: string;
  purpose: string;
  businessGoals?: string;
  targetAudience?: string;
  keyChallenges?: string;
  successMetrics?: string;
  conversationStyle?: string;
  industryContext?: string;
  knowledgeBase?: KnowledgeBase;
}

export interface ElevenLabsKnowledgeBase {
  id: string;
  type: 'text' | 'url' | 'file';
  name: string;
  usage_mode?: 'auto' | 'prompt';
  content?: string;
  url?: string;
  file?: File;
  fileName?: string;
}

// Voice Types
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  accent?: string;
  age?: string;
  gender?: string;
  use_case?: string;
  labels?: Record<string, string>;
  samples?: Array<{
    sample_id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    hash: string;
  }>;
  settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}