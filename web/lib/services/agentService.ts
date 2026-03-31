import { doc, getDoc, onSnapshot, DocumentSnapshot, collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export interface AgentKnowledgeBaseDocument {
  // 11Labs fields
  elevenLabsDocId: string;
  elevenLabsDocName: string;
  elevenLabsDocType: 'text' | 'file' | 'url';
  
  // Internal document fields
  internalDocumentId: string | null;
  internalDocumentTitle: string;
  
  // Metadata
  attachedAt: string;
}

export interface FirestoreAgent {
  id: string;
  name: string;
  description?: string;
  elevenLabsAgentId?: string;
  agentPhoneNumber?: string;
  agentPhoneNumberSid?: string;
  agentEmail?: string;
  agentEmailId?: string;
  channels?: {
    voice?: {
      enabled: boolean;
    };
    sms?: {
      enabled: boolean;
    };
    email?: {
      enabled: boolean;
    };
    webhook?: {
      enabled: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
  lastRefreshedAt?: any; // Firestore Timestamp
  
  // === 11LABS VOICE/TTS CONFIGURATION ===
  currentVoiceId?: string;
  voiceSettings?: {
    stability?: number;
    speed?: number;
    similarity_boost?: number;
    optimize_streaming_latency?: number;
    model_id?: string;
    agent_output_audio_format?: string;
  };
  supportedVoices?: any[];
  pronunciationDictionaries?: any[];
  
  // Legacy voice fields (for backward compatibility)
  selectedVoiceId?: string;
  selectedVoiceName?: string;
  selectedVoiceDescription?: string;
  selectedVoiceCategory?: string;
  selectedVoiceLabels?: string[];
  selectedVoicePreviewUrl?: string;
  voiceRecord?: {
    voiceId?: string;
    voiceName?: string;
    voiceDescription?: string;
    voiceCategory?: string;
    voiceLabels?: string[];
    voicePreviewUrl?: string;
  };
  
  // === 11LABS ASR CONFIGURATION ===
  asrSettings?: {
    provider?: string;
    quality?: string;
    user_input_audio_format?: string;
    keywords?: string[];
  };
  
  // === 11LABS TURN HANDLING ===
  turnSettings?: {
    mode?: string;
    turn_timeout?: number;
    silence_end_call_timeout?: number;
  };
  
  // === 11LABS CONVERSATION SETTINGS ===
  conversationSettings?: {
    text_only?: boolean;
    max_duration_seconds?: number;
    client_events?: string[];
  };
  
  // === 11LABS AGENT/LLM SETTINGS ===
  agentSettings?: {
    language?: string;
    first_message?: string;
    dynamic_variables?: any;
  };
  
  llmSettings?: {
    llm?: string;
    temperature?: number;
    max_tokens?: number;
    prompt?: string;
    timezone?: string;
    ignore_default_personality?: boolean;
  };
  
  // === 11LABS TOOLS & INTEGRATIONS ===
  toolIds?: string[];
  builtInTools?: any;
  customTools?: any[];
  knowledgeBase?: any[]; // Raw 11Labs knowledge base format
  knowledgeBaseDocuments?: AgentKnowledgeBaseDocument[]; // Detailed UI format
  ragSettings?: {
    enabled?: boolean;
    embedding_model?: string;
    max_vector_distance?: number;
    max_documents_length?: number;
    max_retrieved_rag_chunks_count?: number;
  };
  mcpServerIds?: string[];
  nativeMcpServerIds?: string[];
  lastKnowledgeBaseUpdate?: string;
  
  // === 11LABS PHONE NUMBERS ===
  elevenLabsPhoneNumbers?: any[];
  
  // === 11LABS PLATFORM SETTINGS ===
  platformSettings?: {
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
  };
  
  // === 11LABS METADATA ===
  elevenLabsMetadata?: {
    created_at_unix_secs?: number;
    created_at_iso?: string;
  };
  elevenLabsTags?: string[];
  workflow?: any;
  accessInfo?: any;
  
  // === RAW 11LABS CONFIG (for debugging) ===
  elevenLabsFullConfig?: any;
  
  // === BOT AVATAR CONFIGURATION ===
  botAvatarColor?: string;
  botEntityImagePath?: string;
  botIconImagePath?: string;
}

export class AgentService {
  /**
   * Load agent data from Firestore
   */
  static async getAgent(tenantId: string, agentId: string): Promise<FirestoreAgent | null> {
    try {
      const agentRef = doc(db, 'tenants', tenantId, 'agents', agentId);
      const agentDoc = await getDoc(agentRef);
      
      if (agentDoc.exists()) {
        return {
          id: agentDoc.id,
          ...agentDoc.data()
        } as FirestoreAgent;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading agent from Firestore:', error);
      throw error;
    }
  }

  /**
   * Get all agents for a tenant
   */
  static async getAllAgents(tenantId: string): Promise<FirestoreAgent[]> {
    try {
      const agentsRef = collection(db, 'tenants', tenantId, 'agents');
      const agentsSnapshot = await getDocs(agentsRef);
      
      return agentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreAgent[];
    } catch (error) {
      console.error('Error loading all agents from Firestore:', error);
      throw error;
    }
  }

  /**
   * Get phone-capable agents (active status and phone enabled)
   */
  static async getPhoneCapableAgents(tenantId: string): Promise<FirestoreAgent[]> {
    try {
      const allAgents = await this.getAllAgents(tenantId);
      
      return allAgents.filter(agent => {
        const hasPhoneEnabled = agent.channels?.voice?.enabled === true;
        const hasPhoneNumber = agent.agentPhoneNumber && agent.agentPhoneNumber.trim() !== '';
        const isActive = agent.id && agent.name; // Basic active check - can be enhanced
        
        return hasPhoneEnabled && hasPhoneNumber && isActive;
      });
    } catch (error) {
      console.error('Error filtering phone-capable agents:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time agent updates
   */
  static subscribeToAgent(
    tenantId: string, 
    agentId: string, 
    onUpdate: (agent: FirestoreAgent | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    const agentRef = doc(db, 'tenants', tenantId, 'agents', agentId);
    
    return onSnapshot(
      agentRef, 
      (doc: DocumentSnapshot) => {
        if (doc.exists()) {
          const agent = {
            id: doc.id,
            ...doc.data()
          } as FirestoreAgent;
          onUpdate(agent);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.error('Error subscribing to agent updates:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );
  }
}