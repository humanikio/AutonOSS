import axios from 'axios';
import { firestore } from '../../../config/firebase';

export interface UpdateAgentKbDocsRequest {
  tenantId: string;
  agentId: string;
  documentIds: string[]; // Array of internal document IDs to attach
  action: 'add' | 'remove' | 'replace'; // Action to perform
}

export interface UpdateAgentKbDocsResult {
  success: boolean;
  message: string;
  attachedDocuments?: Array<{
    documentId: string;
    elevenLabsDocId: string;
    documentTitle: string;
  }>;
  removedDocuments?: Array<{
    documentId: string;
    elevenLabsDocId: string;
  }>;
  error?: string;
}

export interface KnowledgeBaseDocument {
  id: string;
  type: 'text' | 'file' | 'url';
  name: string;
}

export interface AgentKbIndexEntry {
  documentId: string;
  title: string;
  type: string;
  summary?: string;
  keyPoints?: string[];
  tags?: string[];
  elevenLabsDocId: string;
}

/**
 * Update agent's knowledge base documents by attaching/removing 11Labs document IDs
 */
export async function updateAgentKbDocs(
  request: UpdateAgentKbDocsRequest
): Promise<UpdateAgentKbDocsResult> {
  try {
    const { tenantId, agentId, documentIds, action } = request;

    console.log(`= Starting agent KB docs update: ${action} action for agent ${agentId}`);
    console.log(`=� Document IDs to process: ${documentIds.join(', ')}`);

    // Step 1: Get agent's 11Labs agent ID from Firestore
    const agentRef = firestore
      .collection('tenants').doc(tenantId)
      .collection('agents').doc(agentId);

    const agentSnapshot = await agentRef.get();
    if (!agentSnapshot.exists) {
      return {
        success: false,
        message: 'Agent not found in Firestore',
        error: 'Agent document does not exist'
      };
    }

    const agentData = agentSnapshot.data();
    const elevenLabsAgentId = agentData?.elevenLabsAgentId;

    if (!elevenLabsAgentId) {
      return {
        success: false,
        message: 'Agent does not have an associated 11Labs agent ID',
        error: 'Missing elevenLabsAgentId field'
      };
    }

    console.log(`> Agent 11Labs ID: ${elevenLabsAgentId}`);

    // Step 2: Get 11Labs document IDs from our internal documents
    const documentMappings = await getElevenLabsDocumentIds(tenantId, documentIds);
    
    if (documentMappings.length === 0) {
      return {
        success: false,
        message: 'No valid 11Labs document IDs found for the provided documents',
        error: 'No documents have been synchronized with 11Labs'
      };
    }

    console.log(`= Found ${documentMappings.length} documents with 11Labs IDs`);

    // Step 3: Get current agent configuration from 11Labs
    const currentConfig = await get11LabsAgentConfig(elevenLabsAgentId);
    
    // Step 4: Build new knowledge base array based on action
    let newKnowledgeBase: KnowledgeBaseDocument[] = [];
    const attachedDocuments: Array<{
      documentId: string;
      elevenLabsDocId: string;
      documentTitle: string;
    }> = [];
    const removedDocuments: Array<{
      documentId: string;
      elevenLabsDocId: string;
    }> = [];

    const currentKnowledgeBase: KnowledgeBaseDocument[] = currentConfig.conversation_config?.agent?.prompt?.knowledge_base || [];

    if (action === 'replace') {
      // Replace entire knowledge base with new documents
      newKnowledgeBase = documentMappings.map(doc => ({
        id: doc.elevenLabsDocId,
        type: 'text' as const, // All our documents are text-based
        name: doc.documentTitle
      }));
      
      // Track all as attached
      attachedDocuments.push(...documentMappings.map(doc => ({
        documentId: doc.documentId,
        elevenLabsDocId: doc.elevenLabsDocId,
        documentTitle: doc.documentTitle
      })));

    } else if (action === 'add') {
      // Add new documents to existing knowledge base
      newKnowledgeBase = [...currentKnowledgeBase];
      
      for (const doc of documentMappings) {
        // Only add if not already present
        const exists = newKnowledgeBase.some(kb => kb.id === doc.elevenLabsDocId);
        if (!exists) {
          newKnowledgeBase.push({
            id: doc.elevenLabsDocId,
            type: 'text',
            name: doc.documentTitle
          });
          
          attachedDocuments.push({
            documentId: doc.documentId,
            elevenLabsDocId: doc.elevenLabsDocId,
            documentTitle: doc.documentTitle
          });
        }
      }

    } else if (action === 'remove') {
      // Remove specific documents from knowledge base
      const elevenLabsIdsToRemove = documentMappings.map(doc => doc.elevenLabsDocId);
      
      newKnowledgeBase = currentKnowledgeBase.filter(kb => {
        const shouldRemove = elevenLabsIdsToRemove.includes(kb.id);
        if (shouldRemove) {
          const doc = documentMappings.find(d => d.elevenLabsDocId === kb.id);
          if (doc) {
            removedDocuments.push({
              documentId: doc.documentId,
              elevenLabsDocId: doc.elevenLabsDocId
            });
          }
        }
        return !shouldRemove;
      });
    }

    console.log(`=� New knowledge base will have ${newKnowledgeBase.length} documents`);

    // Step 5: Update agent configuration in 11Labs
    const updateResult = await update11LabsAgentKnowledgeBase(
      elevenLabsAgentId,
      newKnowledgeBase,
      currentConfig
    );

    if (!updateResult.success) {
      return {
        success: false,
        message: `Failed to update 11Labs agent: ${updateResult.error}`,
        error: updateResult.error
      };
    }

    // Step 6: Update our Firestore record with the new knowledge base
    const firestoreKnowledgeBase = newKnowledgeBase.map(kbDoc => {
      const mapping = documentMappings.find(doc => doc.elevenLabsDocId === kbDoc.id);
      return {
        // 11Labs fields
        elevenLabsDocId: kbDoc.id,
        elevenLabsDocName: kbDoc.name,
        elevenLabsDocType: kbDoc.type,
        
        // Internal document fields
        internalDocumentId: mapping?.documentId || null,
        internalDocumentTitle: mapping?.documentTitle || kbDoc.name,
        
        // Metadata
        attachedAt: new Date().toISOString()
      };
    });

    console.log('💾 Writing knowledge base documents to Firestore:', firestoreKnowledgeBase);

    // Generate KB index for agent analysis
    console.log('📊 Generating agent KB index...');
    const agentKbIndex = await generateAgentKbIndex(tenantId, documentMappings);
    console.log(`📚 KB index generated with ${agentKbIndex.length} entries`);

    await agentRef.update({
      knowledgeBase: newKnowledgeBase, // Keep the 11Labs format for backward compatibility
      knowledgeBaseDocuments: firestoreKnowledgeBase, // New detailed format for UI
      knowledgeBaseIndex: agentKbIndex, // Index for agent analysis
      lastKnowledgeBaseUpdate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(` Successfully updated agent KB docs: ${action} action completed`);

    return {
      success: true,
      message: `Successfully ${action === 'add' ? 'added' : action === 'remove' ? 'removed' : 'replaced'} knowledge base documents`,
      attachedDocuments: attachedDocuments.length > 0 ? attachedDocuments : undefined,
      removedDocuments: removedDocuments.length > 0 ? removedDocuments : undefined
    };

  } catch (error) {
    console.error('Error updating agent KB docs:', error);
    return {
      success: false,
      message: 'Failed to update agent knowledge base documents',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate agent KB index from document mappings
 */
async function generateAgentKbIndex(
  tenantId: string,
  documentMappings: Array<{
    documentId: string;
    elevenLabsDocId: string;
    documentTitle: string;
  }>
): Promise<AgentKbIndexEntry[]> {
  const indexEntries: AgentKbIndexEntry[] = [];

  for (const mapping of documentMappings) {
    try {
      // Load full document data to get summary and keyPoints
      const docRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('kbDocs').doc(mapping.documentId);

      const docSnapshot = await docRef.get();
      
      if (docSnapshot.exists) {
        const data = docSnapshot.data();
        
        const indexEntry: AgentKbIndexEntry = {
          documentId: mapping.documentId,
          title: data?.title || mapping.documentTitle,
          type: data?.type || 'guide',
          summary: data?.summary,
          keyPoints: data?.keyPoints || [],
          tags: data?.tags || [],
          elevenLabsDocId: mapping.elevenLabsDocId
        };

        indexEntries.push(indexEntry);
        console.log(`📄 Added to index: ${indexEntry.title}`);
      } else {
        console.warn(`Document ${mapping.documentId} not found for index generation`);
      }
    } catch (error) {
      console.error(`Error loading document ${mapping.documentId} for index:`, error);
    }
  }

  return indexEntries;
}

/**
 * Get 11Labs document IDs from our internal document IDs
 */
async function getElevenLabsDocumentIds(
  tenantId: string,
  documentIds: string[]
): Promise<Array<{
  documentId: string;
  elevenLabsDocId: string;
  documentTitle: string;
}>> {
  const results: Array<{
    documentId: string;
    elevenLabsDocId: string;
    documentTitle: string;
  }> = [];

  for (const documentId of documentIds) {
    try {
      const docRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('kbDocs').doc(documentId);

      const docSnapshot = await docRef.get();
      
      if (docSnapshot.exists) {
        const data = docSnapshot.data();
        
        // Check for current 11Labs ID (from array or single field)
        let elevenLabsDocId: string | undefined;
        
        if (data?.elevenLabsKnowledgeBaseDocIds && Array.isArray(data.elevenLabsKnowledgeBaseDocIds)) {
          // Use first ID from array (most recent)
          elevenLabsDocId = data.elevenLabsKnowledgeBaseDocIds[0];
        } else if (data?.elevenLabsKnowledgeBaseDocId) {
          // Fallback to single ID field
          elevenLabsDocId = data.elevenLabsKnowledgeBaseDocId;
        }

        if (elevenLabsDocId) {
          results.push({
            documentId,
            elevenLabsDocId,
            documentTitle: data?.title || `Document ${documentId}`
          });
        } else {
          console.warn(`Document ${documentId} does not have a 11Labs document ID`);
        }
      } else {
        console.warn(`Document ${documentId} not found in Firestore`);
      }
    } catch (error) {
      console.error(`Error getting 11Labs ID for document ${documentId}:`, error);
    }
  }

  return results;
}

/**
 * Get current 11Labs agent configuration
 */
async function get11LabsAgentConfig(agentId: string): Promise<any> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  const response = await axios.get(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
    {
      headers: {
        'xi-api-key': apiKey
      },
      timeout: 30000
    }
  );

  if (response.status !== 200) {
    throw new Error(`11Labs API returned status ${response.status}: ${response.statusText}`);
  }

  return response.data;
}

/**
 * Update 11Labs agent's knowledge base configuration
 */
async function update11LabsAgentKnowledgeBase(
  agentId: string,
  knowledgeBase: KnowledgeBaseDocument[],
  currentConfig: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    // Build the update payload - only update the knowledge base part
    const updatePayload = {
      conversation_config: {
        agent: {
          prompt: {
            ...currentConfig.conversation_config?.agent?.prompt,
            knowledge_base: knowledgeBase
          }
        }
      }
    };

    console.log(`🔧 Updating 11Labs agent ${agentId} with ${knowledgeBase.length} knowledge base documents`);
    console.log('📝 Update payload:', JSON.stringify(updatePayload, null, 2));

    const response = await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      updatePayload,
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // Log the 11Labs API response for debugging
    console.log('📋 11Labs API response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });

    if (response.status !== 200) {
      throw new Error(`11Labs API returned status ${response.status}: ${response.statusText}`);
    }

    console.log(' Successfully updated 11Labs agent knowledge base');
    
    return { success: true };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('11Labs API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      return {
        success: false,
        error: `11Labs API error (${error.response?.status}): ${error.response?.statusText || error.message}`
      };
    }
    
    console.error('Error updating 11Labs agent knowledge base:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}