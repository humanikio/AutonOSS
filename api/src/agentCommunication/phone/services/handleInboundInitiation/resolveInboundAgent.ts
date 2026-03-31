import { getElevenLabsAgentMapping, type ElevenLabsAgentMapping } from '../../../../agents/agentManagement/services/createAgent/helpers/createElevenLabsAgentMapping';

export interface InboundAgentResolution {
  tenantId: string;
  internalAgentId: string;
  agentName: string;
  elevenLabsAgentId: string;
}

/**
 * Resolves ElevenLabs agent ID to internal tenant and agent data
 * Uses the mapping created during agent creation
 * 
 * @param elevenLabsAgentId - Agent ID from ElevenLabs webhook
 * @returns Promise<InboundAgentResolution> - Resolved agent data
 */
export async function resolveInboundAgent(elevenLabsAgentId: string): Promise<InboundAgentResolution> {
  try {
    console.log(`🔍 Resolving inbound agent: ${elevenLabsAgentId}`);
    
    // Get mapping from our collection
    const mapping: ElevenLabsAgentMapping = await getElevenLabsAgentMapping(elevenLabsAgentId);
    
    console.log(`✅ Agent resolved:`);
    console.log(`   - Tenant: ${mapping.tenantId}`);
    console.log(`   - Internal Agent: ${mapping.internalAgentId}`);
    console.log(`   - Name: ${mapping.agentName}`);
    
    return {
      tenantId: mapping.tenantId,
      internalAgentId: mapping.internalAgentId,
      agentName: mapping.agentName,
      elevenLabsAgentId: mapping.elevenLabsAgentId
    };
    
  } catch (error) {
    console.error('❌ Failed to resolve inbound agent:', error);
    throw new Error(`Agent resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}