import { CallAgent, CallAgentRequest } from '@/types';
import { AgentRepository } from '../repositories/agentRepository';
import { elevenlabsAgentService } from './elevenlabsAgentService';
import { elevenlabsKnowledgeService } from './elevenlabsKnowledgeService';
import { TenantKnowledgeService } from './tenantKnowledgeService';
import { firestore } from '../config/firebase';

export class AgentService {
  // Get all call agents for tenant
  static async getCallAgents(tenantId: string): Promise<CallAgent[]> {
    return await AgentRepository.getCallAgents(tenantId);
  }

  // Get specific call agent
  static async getCallAgent(tenantId: string, agentId: string): Promise<CallAgent | null> {
    return await AgentRepository.getCallAgent(tenantId, agentId);
  }

  // Create a new call agent with knowledge base setup
  static async createCallAgent(
    tenantId: string, 
    userId: string, 
    agentRequest: CallAgentRequest
  ): Promise<CallAgent> {
    // Generate agent ID
    const agentId = AgentRepository.generateAgentId();
    
    // Create agent data with proper type safety
    const agentData: CallAgent = {
      id: agentId,
      tenantId,
      name: agentRequest.name,
      description: agentRequest.description,
      status: 'draft',
      purpose: agentRequest.purpose,
      voiceConfig: {
        voiceId: agentRequest.voiceConfig?.voiceId || '',
        ...(agentRequest.voiceConfig?.voiceName && { voiceName: agentRequest.voiceConfig.voiceName }),
        model: agentRequest.voiceConfig?.model || 'eleven_turbo_v2_5',
        stability: agentRequest.voiceConfig?.stability || 0.5,
        similarity: agentRequest.voiceConfig?.similarity || 0.8,
        speed: agentRequest.voiceConfig?.speed || 1.0,
        ...(agentRequest.voiceConfig?.optimizeLatency !== undefined && { optimizeLatency: agentRequest.voiceConfig.optimizeLatency })
      },
      conversationConfig: {
        firstMessage: agentRequest.conversationConfig?.firstMessage || 'Hello! How can I help you today?',
        systemPrompt: agentRequest.conversationConfig?.systemPrompt || 'You are a helpful AI assistant.',
        language: agentRequest.conversationConfig?.language || 'en',
        maxDurationSeconds: agentRequest.conversationConfig?.maxDurationSeconds || 600,
        llmModel: agentRequest.conversationConfig?.llmModel || 'gemini-2.0-flash',
        temperature: agentRequest.conversationConfig?.temperature || 0.7,
        knowledgeBase: {
          useBusinessInfo: agentRequest.conversationConfig?.knowledgeBase?.useBusinessInfo || false,
          useProducts: agentRequest.conversationConfig?.knowledgeBase?.useProducts || false,
          selectedProductIds: agentRequest.conversationConfig?.knowledgeBase?.selectedProductIds || [],
          useFAQs: agentRequest.conversationConfig?.knowledgeBase?.useFAQs || false,
          selectedFAQCategories: agentRequest.conversationConfig?.knowledgeBase?.selectedFAQCategories || [],
          useBrandGuidelines: agentRequest.conversationConfig?.knowledgeBase?.useBrandGuidelines || false,
          ...(agentRequest.conversationConfig?.knowledgeBase?.customKnowledge && { customKnowledge: agentRequest.conversationConfig.knowledgeBase.customKnowledge }),
          elevenlabsKnowledgeBases: agentRequest.conversationConfig?.knowledgeBase?.elevenlabsKnowledgeBases || []
        }
      },
      behaviorSettings: {
        systemTools: {
          endCall: agentRequest.behaviorSettings?.systemTools?.endCall ?? true,
          detectLanguage: agentRequest.behaviorSettings?.systemTools?.detectLanguage ?? false,
          skipTurn: agentRequest.behaviorSettings?.systemTools?.skipTurn ?? false,
          transferToAgent: agentRequest.behaviorSettings?.systemTools?.transferToAgent ?? false,
          transferToNumber: agentRequest.behaviorSettings?.systemTools?.transferToNumber ?? false,
          playKeypardTouchTone: agentRequest.behaviorSettings?.systemTools?.playKeypardTouchTone ?? false,
          voicemailDetection: agentRequest.behaviorSettings?.systemTools?.voicemailDetection ?? true,
        },
        customToolIds: agentRequest.behaviorSettings?.customToolIds || [],
        endCallOnGoodbye: agentRequest.behaviorSettings?.endCallOnGoodbye ?? true,
        voicemailDetection: agentRequest.behaviorSettings?.voicemailDetection ?? true,
        ...(agentRequest.behaviorSettings?.voicemailMessage && { voicemailMessage: agentRequest.behaviorSettings.voicemailMessage }),
        transferEnabled: agentRequest.behaviorSettings?.transferEnabled ?? false,
        transferNumbers: agentRequest.behaviorSettings?.transferNumbers || [],
        interruptionSensitivity: agentRequest.behaviorSettings?.interruptionSensitivity || 'medium',
        silenceTimeoutSeconds: agentRequest.behaviorSettings?.silenceTimeoutSeconds || 30,
        ...(agentRequest.behaviorSettings?.maxRetries !== undefined && { maxRetries: agentRequest.behaviorSettings.maxRetries })
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
      lastModifiedBy: userId
    };

    // Save to Firestore first
    await AgentRepository.createCallAgent(tenantId, agentData);

    try {
      // Prepare knowledge bases and create ElevenLabs agent
      const { knowledgeBases } = await this.prepareAgentKnowledgeBases(
        agentRequest,
        tenantId
      );
      
      // Create knowledge base documents for wizard custom knowledge first
      const customKnowledgeBases = agentRequest.conversationConfig?.knowledgeBase?.customKnowledgeBases || [];
      const createdCustomKBs = [];
      
      for (const customKB of customKnowledgeBases) {
        try {
          if (customKB.type === 'text' && customKB.content) {
            const createdKB = await elevenlabsKnowledgeService.createKnowledgeBaseFromText(
              customKB.content,
              customKB.name
            );
            createdCustomKBs.push({
              ...customKB,
              elevenlabsId: createdKB.id,
              name: createdKB.name
            });
          } else if (customKB.type === 'url' && customKB.url) {
            const createdKB = await elevenlabsKnowledgeService.createKnowledgeBaseFromUrl(
              customKB.url,
              customKB.name
            );
            createdCustomKBs.push({
              ...customKB,
              elevenlabsId: createdKB.id,
              name: createdKB.name
            });
          }
        } catch (error) {
          console.error(`Failed to create custom knowledge base ${customKB.name}:`, error);
        }
      }
      
      // Update the request body with created custom knowledge bases
      if (createdCustomKBs.length > 0) {
        agentRequest.conversationConfig!.knowledgeBase!.customKnowledgeBases = createdCustomKBs;
      }
      
      // Create ElevenLabs config
      const elevenlabsConfig = elevenlabsAgentService.convertToElevenLabsConfig(agentRequest);
      
      // Add knowledge bases to the ElevenLabs config if any were prepared
      if (knowledgeBases.length > 0) {
        const existingKnowledgeBases = elevenlabsConfig.conversation_config.agent.prompt.knowledge_base || [];
        elevenlabsConfig.conversation_config.agent.prompt.knowledge_base = [...existingKnowledgeBases, ...knowledgeBases];
        
        console.log(`Adding ${knowledgeBases.length} knowledge bases to ElevenLabs agent:`, knowledgeBases.map(kb => kb.name));
      }
      
      // Create agent in ElevenLabs with complete config including knowledge bases
      const elevenlabsAgent = await elevenlabsAgentService.createAgent(elevenlabsConfig);
      
      // Update agent with ElevenLabs ID and set as active
      const updateFields = {
        elevenlabsAgentId: elevenlabsAgent.agent_id,
        status: 'active' as const,
        updatedAt: new Date().toISOString()
      };

      await AgentRepository.updateCallAgentFields(tenantId, agentId, updateFields);

      // Return updated agent data
      return {
        ...agentData,
        ...updateFields
      };

    } catch (elevenlabsError: any) {
      console.error('ElevenLabs agent creation failed:', elevenlabsError);
      
      // Update status to error but keep the agent
      await AgentRepository.updateCallAgentFields(tenantId, agentId, {
        status: 'error',
        updatedAt: new Date().toISOString()
      });
      
      return {
        ...agentData,
        status: 'error'
      };
    }
  }

  // Update call agent
  static async updateCallAgent(
    tenantId: string, 
    agentId: string, 
    userId: string, 
    updateData: Partial<CallAgentRequest>
  ): Promise<CallAgent | null> {
    const currentAgent = await AgentRepository.getCallAgent(tenantId, agentId);
    
    if (!currentAgent) {
      return null;
    }
    
    // Update agent data with proper type merging
    const updatedAgent: CallAgent = {
      ...currentAgent,
      name: updateData.name || currentAgent.name,
      description: updateData.description || currentAgent.description,
      purpose: updateData.purpose || currentAgent.purpose,
      voiceConfig: {
        ...currentAgent.voiceConfig,
        ...updateData.voiceConfig
      },
      conversationConfig: {
        ...currentAgent.conversationConfig,
        ...updateData.conversationConfig,
        knowledgeBase: {
          ...currentAgent.conversationConfig.knowledgeBase,
          ...updateData.conversationConfig?.knowledgeBase
        }
      },
      behaviorSettings: {
        ...currentAgent.behaviorSettings,
        ...updateData.behaviorSettings
      },
      updatedAt: new Date().toISOString(),
      lastModifiedBy: userId
    };

    // Update in Firestore
    await AgentRepository.updateCallAgent(tenantId, agentId, updatedAgent);

    // If agent has ElevenLabs ID, update there too
    if (currentAgent.elevenlabsAgentId) {
      try {
        const elevenlabsConfig = elevenlabsAgentService.convertToElevenLabsConfig(updatedAgent);
        await elevenlabsAgentService.updateAgent(currentAgent.elevenlabsAgentId, elevenlabsConfig);
      } catch (elevenlabsError) {
        console.error('ElevenLabs update failed:', elevenlabsError);
        // Continue - Firestore update succeeded
      }
    }

    return updatedAgent;
  }

  // Delete call agent
  static async deleteCallAgent(tenantId: string, agentId: string): Promise<boolean> {
    const agent = await AgentRepository.getCallAgent(tenantId, agentId);
    
    if (!agent) {
      return false;
    }

    // Delete from ElevenLabs if it exists there
    if (agent.elevenlabsAgentId) {
      try {
        await elevenlabsAgentService.deleteAgent(agent.elevenlabsAgentId);
      } catch (elevenlabsError) {
        console.error('ElevenLabs deletion failed:', elevenlabsError);
        // Continue with Firestore deletion
      }
    }

    // Delete from Firestore
    await AgentRepository.deleteCallAgent(tenantId, agentId);
    return true;
  }

  // Toggle agent status
  static async toggleAgentStatus(tenantId: string, agentId: string, status: 'active' | 'paused'): Promise<boolean> {
    const exists = await AgentRepository.agentExists(tenantId, agentId);
    
    if (!exists) {
      return false;
    }

    await AgentRepository.updateCallAgentFields(tenantId, agentId, {
      status,
      updatedAt: new Date().toISOString()
    });

    return true;
  }

  // Helper method to prepare knowledge bases for an agent using tenant-wide mappings
  private static async prepareAgentKnowledgeBases(
    agentData: CallAgentRequest, 
    tenantId: string
  ): Promise<{
    knowledgeBases: any[]
  }> {
    try {
      console.log('📋 Preparing knowledge bases for agent using tenant mappings...');
      
      const knowledgeSelections = agentData.conversationConfig?.knowledgeBase;
      if (!knowledgeSelections) {
        return { knowledgeBases: [] };
      }

      // Ensure required knowledge bases exist by creating them if needed
      const ensurePromises: Promise<any>[] = [];

      if (knowledgeSelections.useBusinessInfo) {
        ensurePromises.push(TenantKnowledgeService.ensureBusinessInfoKnowledgeBase(tenantId));
      }

      if (knowledgeSelections.useBrandGuidelines) {
        ensurePromises.push(TenantKnowledgeService.ensureBrandGuidelinesKnowledgeBase(tenantId));
      }

      if (knowledgeSelections.selectedProductIds) {
        for (const productId of knowledgeSelections.selectedProductIds) {
          ensurePromises.push(TenantKnowledgeService.ensureProductKnowledgeBase(tenantId, productId));
        }
      }

      if (knowledgeSelections.selectedFAQCategories) {
        for (const category of knowledgeSelections.selectedFAQCategories) {
          ensurePromises.push(TenantKnowledgeService.ensureFAQCategoryKnowledgeBase(tenantId, category));
        }
      }

      // Wait for all knowledge bases to be ensured
      await Promise.all(ensurePromises);

      // Now build the knowledge base objects using tenant mappings
      const knowledgeBases = await TenantKnowledgeService.buildKnowledgeBasesForAgent(
        tenantId,
        knowledgeSelections
      );

      console.log(`✅ Prepared ${knowledgeBases.length} knowledge bases for agent`);
      
      return { knowledgeBases };
      
    } catch (error) {
      console.error('Error preparing knowledge bases:', error);
      return { knowledgeBases: [] };
    }
  }
}