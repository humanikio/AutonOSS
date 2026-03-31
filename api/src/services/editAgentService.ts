import { firestore } from '../config/firebase';
import { CallAgent } from '@/types';
import { elevenlabsAgentService } from './elevenlabsAgentService';
import { elevenlabsVoiceService } from './elevenlabsVoiceService';
import { TenantKnowledgeService } from './tenantKnowledgeService';

export class EditAgentService {
  static async updateBasicInfo(
    tenantId: string,
    agentId: string,
    basicInfo: {
      name?: string;
      description?: string;
      status?: 'active' | 'inactive' | 'archived';
    }
  ): Promise<void> {
    const agentRef = firestore.collection('tenants').doc(tenantId)
      .collection('callAgents').doc(agentId);

    const updateData: any = {
      updatedAt: new Date()
    };

    if (basicInfo.name !== undefined) updateData.name = basicInfo.name;
    if (basicInfo.description !== undefined) updateData.description = basicInfo.description;
    if (basicInfo.status !== undefined) updateData.status = basicInfo.status;

    await agentRef.update(updateData);

    // Update ElevenLabs agent name if changed
    if (basicInfo.name !== undefined) {
      const agentDoc = await agentRef.get();
      const agent = agentDoc.data() as CallAgent;
      
      if (agent.elevenlabsAgentId) {
        await elevenlabsAgentService.updateAgent(agent.elevenlabsAgentId, {
          name: basicInfo.name
        });
      }
    }
  }

  static async updateVoiceSettings(
    tenantId: string,
    agentId: string,
    voiceSettings: {
      voiceId?: string;
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
    }
  ): Promise<void> {
    const agentRef = firestore.collection('tenants').doc(tenantId)
      .collection('callAgents').doc(agentId);

    const agentDoc = await agentRef.get();
    const agent = agentDoc.data() as CallAgent;

    const currentVoiceConfig = agent.voiceConfig || {};
    const updatedVoiceConfig = {
      ...currentVoiceConfig,
      ...voiceSettings
    };

    await agentRef.update({
      voiceConfig: updatedVoiceConfig,
      updatedAt: new Date()
    });

    // Update ElevenLabs agent voice settings
    if (agent.elevenlabsAgentId) {
      const updateData: any = {};
      
      if (voiceSettings.voiceId) {
        updateData.conversation_config = {
          tts: {
            voice_id: voiceSettings.voiceId,
            stability: voiceSettings.stability || currentVoiceConfig.stability,
            similarity_boost: voiceSettings.similarityBoost || currentVoiceConfig.similarity,
            style: voiceSettings.style || 0,
            use_speaker_boost: voiceSettings.useSpeakerBoost || false
          }
        };
      }

      if (Object.keys(updateData).length > 0) {
        await elevenlabsAgentService.updateAgent(agent.elevenlabsAgentId, updateData);
      }
    }
  }

  static async updateConversationSettings(
    tenantId: string,
    agentId: string,
    conversationSettings: {
      systemPrompt?: string;
      firstMessage?: string;
      language?: string;
    }
  ): Promise<void> {
    const agentRef = firestore.collection('tenants').doc(tenantId)
      .collection('callAgents').doc(agentId);

    const agentDoc = await agentRef.get();
    const agent = agentDoc.data() as CallAgent;

    const currentConversationConfig = agent.conversationConfig || {};
    const updatedConversationConfig = {
      ...currentConversationConfig,
      ...conversationSettings
    };

    await agentRef.update({
      conversationConfig: updatedConversationConfig,
      updatedAt: new Date()
    });

    // Update ElevenLabs agent conversation config
    if (agent.elevenlabsAgentId) {
      const updateData: any = {
        conversation_config: {
          agent: {
            prompt: {
              prompt: conversationSettings.systemPrompt || currentConversationConfig.systemPrompt
            }
          }
        }
      };

      if (conversationSettings.firstMessage) {
        updateData.conversation_config.agent.first_message = conversationSettings.firstMessage;
      }

      if (conversationSettings.language) {
        updateData.conversation_config.agent.language = conversationSettings.language;
      }

      await elevenlabsAgentService.updateAgent(agent.elevenlabsAgentId, updateData);
    }
  }

  static async updateBehaviorSettings(
    tenantId: string,
    agentId: string,
    behaviorSettings: {
      responseLength?: 'short' | 'medium' | 'long';
      interruptionSensitivity?: 'low' | 'medium' | 'high';
      systemToolIds?: string[];
      customToolIds?: string[];
    }
  ): Promise<void> {
    const agentRef = firestore.collection('tenants').doc(tenantId)
      .collection('callAgents').doc(agentId);

    const agentDoc = await agentRef.get();
    const agent = agentDoc.data() as CallAgent;

    const currentBehaviorSettings = agent.behaviorSettings || {};
    const updatedBehaviorSettings = {
      ...currentBehaviorSettings,
      ...behaviorSettings
    };

    await agentRef.update({
      behaviorSettings: updatedBehaviorSettings,
      updatedAt: new Date()
    });

    // Update ElevenLabs agent behavior config
    if (agent.elevenlabsAgentId) {
      const updateData: any = {
        conversation_config: {
          agent: {
            prompt: {}
          }
        }
      };

      console.log('🔍 Processing tools:', {
        systemToolIds: behaviorSettings.systemToolIds,
        customToolIds: behaviorSettings.customToolIds
      });
      
      // Handle SYSTEM TOOLS using built_in_tools format (2025 API)
      // Send ALL possible system tools with explicit enabled/disabled states
      const builtInTools: any = {};
      const enabledSystemTools = behaviorSettings.systemToolIds || [];
      
      console.log('✓ Processing system tools - enabled:', enabledSystemTools);
      
      // Define all possible system tools and their states
      const allPossibleTools = [
        'endCall', 'voicemailDetection', 'detectLanguage', 'skipTurn', 
        'transferToAgent', 'transferToNumber', 'playKeypardTouchTone'
      ];
      
      console.log('🔍 All possible tools:', allPossibleTools);
      console.log('🔍 Disabled tools:', allPossibleTools.filter(tool => !enabledSystemTools.includes(tool)));
      
      // Process each possible tool
      for (const toolId of allPossibleTools) {
        const isEnabled = enabledSystemTools.includes(toolId);
        
        if (isEnabled) {
          // Only add enabled tools to built_in_tools
          switch (toolId) {
            case 'endCall':
              builtInTools.end_call = {
                name: 'end_call',
                description: 'Ends the call when the user says goodbye',
                params: { system_tool_type: 'end_call' }
              };
              break;
            case 'voicemailDetection':
              builtInTools.voicemail_detection = {
                name: 'voicemail_detection',
                description: 'Detects voicemail systems and optionally leaves a message',
                params: { system_tool_type: 'voicemail_detection' }
              };
              break;
            case 'detectLanguage':
              builtInTools.language_detection = {
                name: 'language_detection',
                description: 'Detects and switches language during conversation',
                params: { system_tool_type: 'language_detection' }
              };
              break;
            case 'skipTurn':
              builtInTools.skip_turn = {
                name: 'skip_turn',
                description: 'Skips turn when user explicitly indicates they need a moment',
                params: { system_tool_type: 'skip_turn' }
              };
              break;
            case 'transferToAgent':
              builtInTools.transfer_to_agent = {
                name: 'transfer_to_agent',
                description: 'Transfers the call to a human agent',
                params: { system_tool_type: 'transfer_to_agent' }
              };
              break;
            case 'transferToNumber':
              builtInTools.transfer_to_number = {
                name: 'transfer_to_number',
                description: 'Transfers the call to a specific phone number',
                params: { system_tool_type: 'transfer_to_number' }
              };
              break;
            case 'playKeypardTouchTone':
              builtInTools.play_keypad_touch_tone = {
                name: 'play_keypad_touch_tone',
                description: 'Plays DTMF tones for keypad interactions',
                params: { system_tool_type: 'play_keypad_touch_tone' }
              };
              break;
            default:
              console.warn(`⚠️ Unknown system tool: ${toolId}`);
          }
        } else {
          // Try sending disabled tools as empty objects to explicitly disable them
          switch (toolId) {
            case 'detectLanguage':
              builtInTools.language_detection = null;
              break;
            case 'skipTurn':
              builtInTools.skip_turn = null;
              break;
            case 'transferToAgent':
              builtInTools.transfer_to_agent = null;
              break;
            case 'transferToNumber':
              builtInTools.transfer_to_number = null;
              break;
            case 'playKeypardTouchTone':
              builtInTools.play_keypad_touch_tone = null;
              break;
          }
          console.log(`🔕 Explicitly disabling tool: ${toolId}`);
        }
      }
      
      // Always set built_in_tools - this will replace ALL existing system tools
      updateData.conversation_config.agent.prompt.built_in_tools = builtInTools;
      console.log('✅ Setting built-in system tools:', Object.keys(builtInTools).length > 0 ? Object.keys(builtInTools) : 'NONE (clearing all system tools)');
      
      // Handle CUSTOM TOOLS using tool_ids array
      if (behaviorSettings.customToolIds && Array.isArray(behaviorSettings.customToolIds)) {
        updateData.conversation_config.agent.prompt.tool_ids = behaviorSettings.customToolIds;
        console.log('✅ Added custom tool IDs:', behaviorSettings.customToolIds);
      } else {
        updateData.conversation_config.agent.prompt.tool_ids = [];
        console.log('ℹ️ No custom tools provided');
      }

      if (behaviorSettings.responseLength) {
        // Map response length to ElevenLabs config
        const lengthMapping = {
          'short': 'concise',
          'medium': 'balanced',
          'long': 'detailed'
        };
        updateData.conversation_config.agent.prompt.response_length = lengthMapping[behaviorSettings.responseLength];
      }

      if (behaviorSettings.interruptionSensitivity) {
        // Map interruption sensitivity if needed
        updateData.conversation_config.agent.interruption_sensitivity = behaviorSettings.interruptionSensitivity;
      }

      console.log('🚀 Updating ElevenLabs agent behavior:', JSON.stringify(updateData, null, 2));
      await elevenlabsAgentService.updateAgent(agent.elevenlabsAgentId, updateData);
      console.log('✅ ElevenLabs agent behavior updated successfully');
    }
  }

  static async updateKnowledgeBase(
    tenantId: string,
    agentId: string,
    knowledgeSettings: any
  ): Promise<void> {
    const agentRef = firestore.collection('tenants').doc(tenantId)
      .collection('callAgents').doc(agentId);

    const agentDoc = await agentRef.get();
    const agent = agentDoc.data() as CallAgent;

    console.log('🔄 Updating agent knowledge base using tenant-wide mappings...');

    try {
      // Ensure all selected knowledge bases exist (create missing ones)
      const ensurePromises: Promise<any>[] = [];

      if (knowledgeSettings.useBusinessInfo) {
        ensurePromises.push(TenantKnowledgeService.ensureBusinessInfoKnowledgeBase(tenantId));
      }

      if (knowledgeSettings.useBrandGuidelines) {
        ensurePromises.push(TenantKnowledgeService.ensureBrandGuidelinesKnowledgeBase(tenantId));
      }

      if (knowledgeSettings.selectedProductIds) {
        for (const productId of knowledgeSettings.selectedProductIds) {
          ensurePromises.push(TenantKnowledgeService.ensureProductKnowledgeBase(tenantId, productId));
        }
      }

      if (knowledgeSettings.selectedFAQCategories) {
        for (const category of knowledgeSettings.selectedFAQCategories) {
          ensurePromises.push(TenantKnowledgeService.ensureFAQCategoryKnowledgeBase(tenantId, category));
        }
      }

      // Wait for all knowledge bases to be ensured
      console.log('⏳ Ensuring all selected knowledge bases exist...');
      await Promise.all(ensurePromises);

      // Build knowledge base objects using tenant mappings
      const knowledgeBaseObjects = await TenantKnowledgeService.buildKnowledgeBasesForAgent(
        tenantId,
        knowledgeSettings
      );

      console.log(`📋 Built ${knowledgeBaseObjects.length} knowledge bases for agent`);

      // Update Firestore with new knowledge base settings
      await agentRef.update({
        'conversationConfig.knowledgeBase': knowledgeSettings,
        updatedAt: new Date()
      });

      // Update ElevenLabs agent with the knowledge base objects
      if (agent.elevenlabsAgentId) {
        const updateData = {
          conversation_config: {
            agent: {
              prompt: {
                knowledge_base: knowledgeBaseObjects
              }
            }
          }
        };

        console.log('🚀 Updating ElevenLabs agent with knowledge bases...');

        await elevenlabsAgentService.updateAgent(agent.elevenlabsAgentId, updateData as any);
        console.log(`✅ Successfully updated ElevenLabs agent with ${knowledgeBaseObjects.length} knowledge bases`);
      } else {
        console.warn('⚠️ No ElevenLabs agent ID found - skipping ElevenLabs update');
      }

    } catch (error) {
      console.error('❌ Failed to update knowledge base:', error);
      throw error;
    }
  }

  static async getAgentForEdit(tenantId: string, agentId: string): Promise<CallAgent | null> {
    const agentRef = firestore.collection('tenants').doc(tenantId)
      .collection('callAgents').doc(agentId);

    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      return null;
    }

    return { id: agentDoc.id, ...agentDoc.data() } as CallAgent;
  }

  static async validateAgentOwnership(tenantId: string, agentId: string): Promise<boolean> {
    const agent = await this.getAgentForEdit(tenantId, agentId);
    return agent !== null;
  }
}