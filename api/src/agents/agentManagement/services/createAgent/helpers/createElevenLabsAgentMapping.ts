import { firestore } from '../../../../../config/firebase';

export interface ElevenLabsAgentMapping {
  elevenLabsAgentId: string;
  tenantId: string;
  internalAgentId: string;
  agentName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Creates a mapping document to resolve ElevenLabs agent IDs to internal tenant/agent data
 * This is essential for inbound call handling where we only receive the ElevenLabs agent ID
 * 
 * @param elevenLabsAgentId - The agent ID from ElevenLabs API
 * @param tenantId - Internal tenant identifier
 * @param internalAgentId - Internal agent UUID
 * @param agentName - Agent display name (for debugging)
 */
export async function createElevenLabsAgentMapping(
  elevenLabsAgentId: string,
  tenantId: string,
  internalAgentId: string,
  agentName: string
): Promise<void> {
  try {
    console.log(`🔗 Creating ElevenLabs agent mapping for ${agentName} (${elevenLabsAgentId})`);
    
    // Create mapping document using ElevenLabs agent ID as document ID
    const mappingRef = firestore
      .collection('elevenLabsAgentMappings')
      .doc(elevenLabsAgentId);
    
    const mappingData: ElevenLabsAgentMapping = {
      elevenLabsAgentId,
      tenantId,
      internalAgentId,
      agentName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await mappingRef.set(mappingData);
    
    console.log(`✅ Created ElevenLabs agent mapping:`);
    console.log(`   - ElevenLabs ID: ${elevenLabsAgentId}`);
    console.log(`   - Tenant ID: ${tenantId}`);
    console.log(`   - Internal Agent ID: ${internalAgentId}`);
    console.log(`   - Agent Name: ${agentName}`);
    
  } catch (error) {
    console.error('❌ Error creating ElevenLabs agent mapping:', error);
    throw new Error(`Failed to create ElevenLabs agent mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieves internal agent data from ElevenLabs agent ID
 * Used by inbound call handlers to resolve agent context
 * 
 * @param elevenLabsAgentId - The agent ID from ElevenLabs webhook
 * @returns Promise<ElevenLabsAgentMapping> - The mapping data
 */
export async function getElevenLabsAgentMapping(
  elevenLabsAgentId: string
): Promise<ElevenLabsAgentMapping> {
  try {
    console.log(`🔍 Looking up ElevenLabs agent mapping for: ${elevenLabsAgentId}`);
    
    const mappingRef = firestore
      .collection('elevenLabsAgentMappings')
      .doc(elevenLabsAgentId);
    
    const mappingDoc = await mappingRef.get();
    
    if (!mappingDoc.exists) {
      throw new Error(`No mapping found for ElevenLabs agent ID: ${elevenLabsAgentId}`);
    }
    
    const mappingData = mappingDoc.data() as ElevenLabsAgentMapping;
    
    console.log(`✅ Found mapping for ${elevenLabsAgentId}:`);
    console.log(`   - Tenant: ${mappingData.tenantId}`);
    console.log(`   - Internal Agent: ${mappingData.internalAgentId}`);
    console.log(`   - Name: ${mappingData.agentName}`);
    
    return mappingData;
    
  } catch (error) {
    console.error('❌ Error retrieving ElevenLabs agent mapping:', error);
    throw new Error(`Failed to retrieve ElevenLabs agent mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}