import { firestore } from '../config/firebase';
import { elevenlabsAgentService } from './elevenlabsAgentService';
import { elevenlabsKnowledgeService } from './elevenlabsKnowledgeService';
import { knowledgeConversionService } from './knowledgeConversionService';
import { 
  CallAgent,
  BusinessInfo,
  Product,
  FAQ,
  BrandGuidelines
} from '@/types';

export interface KnowledgeChanges {
  businessInfoChanged: boolean;
  productsChanged: string[]; // IDs of changed products
  faqsChanged: string[];     // Changed categories
  brandGuidelinesChanged: boolean;
  affectedAgents: string[];  // Agent IDs that need updates
}

export interface SyncResult {
  agentId: string;
  agentName: string;
  success: boolean;
  error?: string;
  syncedTypes: string[];
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  currentAgent?: string;
}

class KnowledgeSyncService {
  // Detect what knowledge has changed since last sync
  async detectKnowledgeChanges(tenantId: string): Promise<KnowledgeChanges> {
    try {
      const tenantRef = firestore.collection('tenants').doc(tenantId);
      const changes: KnowledgeChanges = {
        businessInfoChanged: false,
        productsChanged: [],
        faqsChanged: [],
        brandGuidelinesChanged: false,
        affectedAgents: []
      };

      // Get all agents for this tenant
      const agentsSnapshot = await tenantRef.collection('callAgents').get();
      const agents = agentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CallAgent));

      // Get current knowledge data
      const [businessInfoDoc, productsSnapshot, faqsSnapshot, brandGuidelinesDoc] = await Promise.all([
        tenantRef.collection('businessInfo').doc('info').get(),
        tenantRef.collection('products').get(),
        tenantRef.collection('faqs').get(),
        tenantRef.collection('brandGuidelines').doc('guidelines').get()
      ]);

      const businessInfo = businessInfoDoc.exists ? businessInfoDoc.data() as BusinessInfo : null;
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      const faqs = faqsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FAQ));
      const brandGuidelines = brandGuidelinesDoc.exists ? brandGuidelinesDoc.data() as BrandGuidelines : null;

      // Generate current hashes
      const currentHashes = {
        businessInfo: businessInfo ? knowledgeConversionService.generateContentHash(businessInfo) : null,
        products: knowledgeConversionService.generateContentHash(products),
        faqs: knowledgeConversionService.generateContentHash(faqs),
        brandGuidelines: brandGuidelines ? knowledgeConversionService.generateContentHash(brandGuidelines) : null
      };

      // Check each agent for changes
      for (const agent of agents) {
        const sync = agent.knowledgeSync;
        if (!sync) continue; // Skip agents without sync data

        const agentChanges: string[] = [];

        // Check business info
        if (agent.knowledgeBaseMappings?.businessInfoId && 
            sync.businessInfoVersion !== currentHashes.businessInfo) {
          changes.businessInfoChanged = true;
          agentChanges.push('businessInfo');
        }

        // Check products
        if (agent.knowledgeBaseMappings?.productIds) {
          const agentProductIds = Object.keys(agent.knowledgeBaseMappings.productIds);
          const currentProducts = products.filter(p => agentProductIds.includes(p.id!));
          const currentProductsHash = knowledgeConversionService.generateContentHash(currentProducts);
          
          if (sync.productsVersion !== currentProductsHash) {
            // Find which specific products changed
            for (const productId of agentProductIds) {
              const product = products.find(p => p.id === productId);
              if (product) {
                const productHash = knowledgeConversionService.generateContentHash(product);
                // For simplicity, we'll mark all agent products as changed if any changed
                if (!changes.productsChanged.includes(productId)) {
                  changes.productsChanged.push(productId);
                }
              }
            }
            agentChanges.push('products');
          }
        }

        // Check FAQs
        if (agent.knowledgeBaseMappings?.faqCategoryIds) {
          const agentCategories = Object.keys(agent.knowledgeBaseMappings.faqCategoryIds);
          const currentCategoryFaqs = faqs.filter(faq => agentCategories.includes(faq.category));
          const currentFaqsHash = knowledgeConversionService.generateContentHash(currentCategoryFaqs);
          
          if (sync.faqsVersion !== currentFaqsHash) {
            // Find which specific categories changed
            for (const category of agentCategories) {
              if (!changes.faqsChanged.includes(category)) {
                changes.faqsChanged.push(category);
              }
            }
            agentChanges.push('faqs');
          }
        }

        // Check brand guidelines
        if (agent.knowledgeBaseMappings?.brandGuidelinesId && 
            sync.brandGuidelinesVersion !== currentHashes.brandGuidelines) {
          changes.brandGuidelinesChanged = true;
          agentChanges.push('brandGuidelines');
        }

        // If any changes detected for this agent, add to affected list
        if (agentChanges.length > 0 && !changes.affectedAgents.includes(agent.id!)) {
          changes.affectedAgents.push(agent.id!);
        }
      }

      return changes;

    } catch (error) {
      console.error('Failed to detect knowledge changes:', error);
      throw error;
    }
  }

  // Sync knowledge for specific agents
  async syncAgentsKnowledge(tenantId: string, agentIds: string[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    const tenantRef = firestore.collection('tenants').doc(tenantId);

    // Get knowledge data once
    const [businessInfoDoc, productsSnapshot, faqsSnapshot, brandGuidelinesDoc] = await Promise.all([
      tenantRef.collection('businessInfo').doc('info').get(),
      tenantRef.collection('products').get(),
      tenantRef.collection('faqs').get(),
      tenantRef.collection('brandGuidelines').doc('guidelines').get()
    ]);

    const businessInfo = businessInfoDoc.exists ? businessInfoDoc.data() as BusinessInfo : null;
    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    const faqs = faqsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FAQ));
    const brandGuidelines = brandGuidelinesDoc.exists ? brandGuidelinesDoc.data() as BrandGuidelines : null;

    // Process each agent
    for (const agentId of agentIds) {
      try {
        const agentDoc = await tenantRef.collection('callAgents').doc(agentId).get();
        if (!agentDoc.exists) {
          results.push({
            agentId,
            agentName: 'Unknown',
            success: false,
            error: 'Agent not found',
            syncedTypes: []
          });
          continue;
        }

        const agent = { id: agentDoc.id, ...agentDoc.data() } as CallAgent;
        const syncResult = await this.syncSingleAgent(agent, {
          businessInfo,
          products,
          faqs,
          brandGuidelines
        }, tenantId);

        results.push(syncResult);

      } catch (error) {
        console.error(`Failed to sync agent ${agentId}:`, error);
        results.push({
          agentId,
          agentName: 'Unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          syncedTypes: []
        });
      }
    }

    return results;
  }

  // Sync a single agent
  private async syncSingleAgent(
    agent: CallAgent,
    knowledgeData: {
      businessInfo: BusinessInfo | null;
      products: Product[];
      faqs: FAQ[];
      brandGuidelines: BrandGuidelines | null;
    },
    tenantId: string
  ): Promise<SyncResult> {
    const syncedTypes: string[] = [];
    const updatedVersions: Record<string, string> = {};

    try {
      // Prepare updated knowledge bases
      const knowledgeBases: any[] = [];

      // Add business info if agent uses it
      if (agent.knowledgeBaseMappings?.businessInfoId && knowledgeData.businessInfo) {
        const kbRequest = knowledgeConversionService.convertBusinessInfoToKnowledgeBase(knowledgeData.businessInfo, tenantId);
        knowledgeBases.push({
          type: kbRequest.type,
          name: kbRequest.name,
          id: agent.knowledgeBaseMappings.businessInfoId,
          content: kbRequest.content,
          usage_mode: kbRequest.usage_mode || 'auto'
        });
        
        syncedTypes.push('Business Information');
        updatedVersions.businessInfoVersion = knowledgeConversionService.generateContentHash(knowledgeData.businessInfo);
      }

      // Add products if agent uses them
      if (agent.knowledgeBaseMappings?.productIds) {
        for (const [productId, kbId] of Object.entries(agent.knowledgeBaseMappings.productIds)) {
          const product = knowledgeData.products.find(p => p.id === productId);
          if (product) {
            const kbRequest = knowledgeConversionService.convertProductToKnowledgeBase(product, tenantId);
            knowledgeBases.push({
              type: kbRequest.type,
              name: kbRequest.name,
              id: kbId,
              content: kbRequest.content,
              usage_mode: kbRequest.usage_mode || 'auto'
            });
          }
        }
        
        if (Object.keys(agent.knowledgeBaseMappings.productIds).length > 0) {
          syncedTypes.push('Products');
          const agentProducts = knowledgeData.products.filter(p => 
            Object.keys(agent.knowledgeBaseMappings?.productIds || {}).includes(p.id!)
          );
          updatedVersions.productsVersion = knowledgeConversionService.generateContentHash(agentProducts);
        }
      }

      // Add FAQs if agent uses them
      if (agent.knowledgeBaseMappings?.faqCategoryIds) {
        for (const [category, kbId] of Object.entries(agent.knowledgeBaseMappings.faqCategoryIds)) {
          const kbRequest = knowledgeConversionService.convertFAQCategoryToKnowledgeBase(knowledgeData.faqs, category, tenantId);
          knowledgeBases.push({
            type: kbRequest.type,
            name: kbRequest.name,
            id: kbId,
            content: kbRequest.content,
            usage_mode: kbRequest.usage_mode || 'auto'
          });
        }
        
        if (Object.keys(agent.knowledgeBaseMappings.faqCategoryIds).length > 0) {
          syncedTypes.push('FAQs');
          const agentFaqs = knowledgeData.faqs.filter(faq => 
            Object.keys(agent.knowledgeBaseMappings?.faqCategoryIds || {}).includes(faq.category)
          );
          updatedVersions.faqsVersion = knowledgeConversionService.generateContentHash(agentFaqs);
        }
      }

      // Add brand guidelines if agent uses them
      if (agent.knowledgeBaseMappings?.brandGuidelinesId && knowledgeData.brandGuidelines) {
        const kbRequest = knowledgeConversionService.convertBrandGuidelinesToKnowledgeBase(knowledgeData.brandGuidelines, tenantId);
        knowledgeBases.push({
          type: kbRequest.type,
          name: kbRequest.name,
          id: agent.knowledgeBaseMappings.brandGuidelinesId,
          content: kbRequest.content,
          usage_mode: kbRequest.usage_mode || 'auto'
        });
        
        syncedTypes.push('Brand Guidelines');
        updatedVersions.brandGuidelinesVersion = knowledgeConversionService.generateContentHash(knowledgeData.brandGuidelines);
      }

      // Update the ElevenLabs agent with new knowledge bases
      if (agent.elevenlabsAgentId && knowledgeBases.length > 0) {
        // Get current agent config
        const currentAgent = await elevenlabsAgentService.getAgent(agent.elevenlabsAgentId);
        
        // Update with new knowledge bases
        const updateConfig = {
          conversation_config: {
            ...currentAgent.conversation_config,
            agent: {
              ...currentAgent.conversation_config.agent,
              knowledge_base: knowledgeBases
            }
          }
        };
        
        await elevenlabsAgentService.updateAgent(agent.elevenlabsAgentId, updateConfig);
      }

      // Update agent's sync status
      const updatedSync = {
        ...agent.knowledgeSync,
        lastSyncAt: new Date().toISOString(),
        syncStatus: 'synced' as const,
        lastSyncError: undefined,
        ...updatedVersions
      };

      await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('callAgents')
        .doc(agent.id!)
        .update({
          knowledgeSync: updatedSync
        });

      return {
        agentId: agent.id!,
        agentName: agent.name,
        success: true,
        syncedTypes
      };

    } catch (error) {
      console.error(`Failed to sync agent ${agent.name}:`, error);
      
      // Update sync status to failed
      const failedSync = {
        ...agent.knowledgeSync,
        lastSyncAt: new Date().toISOString(),
        syncStatus: 'failed' as const,
        lastSyncError: error instanceof Error ? error.message : 'Unknown error'
      };

      await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('callAgents')
        .doc(agent.id!)
        .update({
          knowledgeSync: failedSync
        });

      return {
        agentId: agent.id!,
        agentName: agent.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        syncedTypes
      };
    }
  }

  // Get sync status for all agents
  async getSyncStatus(tenantId: string): Promise<{
    agents: Array<{
      id: string;
      name: string;
      status: 'synced' | 'pending' | 'failed';
      lastSyncAt?: string;
      lastSyncError?: string;
    }>;
    totalAgents: number;
    syncedAgents: number;
    pendingAgents: number;
    failedAgents: number;
  }> {
    try {
      const agentsSnapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('callAgents')
        .get();

      const agents = agentsSnapshot.docs.map(doc => {
        const data = doc.data() as CallAgent;
        return {
          id: doc.id,
          name: data.name,
          status: data.knowledgeSync?.syncStatus || 'pending',
          lastSyncAt: data.knowledgeSync?.lastSyncAt,
          lastSyncError: data.knowledgeSync?.lastSyncError
        };
      });

      // Detect changes to determine which agents are actually pending
      const changes = await this.detectKnowledgeChanges(tenantId);
      const agentsWithChanges = new Set(changes.affectedAgents);

      // Update status based on detected changes
      const updatedAgents = agents.map(agent => ({
        ...agent,
        status: agentsWithChanges.has(agent.id) ? 'pending' as const : agent.status
      }));

      const counts = updatedAgents.reduce((acc, agent) => {
        const key = `${agent.status}Agents` as keyof typeof acc;
        acc[key]++;
        return acc;
      }, {
        syncedAgents: 0,
        pendingAgents: 0,
        failedAgents: 0
      });

      return {
        agents: updatedAgents,
        totalAgents: agents.length,
        ...counts
      };

    } catch (error) {
      console.error('Failed to get sync status:', error);
      throw error;
    }
  }

  // Utility method to get affected agents by knowledge type
  async getAffectedAgentsByKnowledgeType(
    tenantId: string, 
    knowledgeType: 'businessInfo' | 'products' | 'faqs' | 'brandGuidelines',
    itemIds?: string[] // For products/FAQs, specify which items
  ): Promise<string[]> {
    try {
      const agentsSnapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('callAgents')
        .get();

      const affectedAgents: string[] = [];

      for (const doc of agentsSnapshot.docs) {
        const agent = { id: doc.id, ...doc.data() } as CallAgent;
        const mappings = agent.knowledgeBaseMappings;

        if (!mappings) continue;

        switch (knowledgeType) {
          case 'businessInfo':
            if (mappings.businessInfoId) {
              affectedAgents.push(agent.id!);
            }
            break;

          case 'products':
            if (mappings.productIds && itemIds) {
              const hasAffectedProducts = itemIds.some(productId => 
                mappings.productIds![productId]
              );
              if (hasAffectedProducts) {
                affectedAgents.push(agent.id!);
              }
            } else if (mappings.productIds && Object.keys(mappings.productIds).length > 0) {
              affectedAgents.push(agent.id!);
            }
            break;

          case 'faqs':
            if (mappings.faqCategoryIds && itemIds) {
              const hasAffectedCategories = itemIds.some(category => 
                mappings.faqCategoryIds![category]
              );
              if (hasAffectedCategories) {
                affectedAgents.push(agent.id!);
              }
            } else if (mappings.faqCategoryIds && Object.keys(mappings.faqCategoryIds).length > 0) {
              affectedAgents.push(agent.id!);
            }
            break;

          case 'brandGuidelines':
            if (mappings.brandGuidelinesId) {
              affectedAgents.push(agent.id!);
            }
            break;
        }
      }

      return affectedAgents;

    } catch (error) {
      console.error('Failed to get affected agents:', error);
      throw error;
    }
  }
}

export const knowledgeSyncService = new KnowledgeSyncService();