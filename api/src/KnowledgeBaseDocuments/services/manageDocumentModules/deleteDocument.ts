import { firestore } from '../../../config/firebase';

export const deleteDocument = async (tenantId: string, docId: string): Promise<boolean> => {
  try {
    // Get document reference
    const docRef = firestore.collection('tenants').doc(tenantId).collection('kbDocs').doc(docId);
    
    // Check if document exists
    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      console.log(`Document ${docId} not found for tenant ${tenantId}`);
      return false;
    }

    const documentData = docSnapshot.data();
    console.log(`🗑️ Starting cascade delete for document: ${documentData?.title || docId}`);

    // Step 1: Delete the document
    await docRef.delete();
    console.log(`✅ Document ${docId} deleted from kbDocs collection`);

    // Step 2: Clean up agent knowledge base indexes
    await cleanupAgentIndexes(tenantId, docId, documentData?.title);

    console.log(`✅ Successfully deleted document ${docId} and cleaned up agent references`);
    return true;

  } catch (error) {
    console.error(`❌ Error deleting document ${docId} for tenant ${tenantId}:`, error);
    throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Clean up all agent knowledge base indexes that reference the deleted document
 */
async function cleanupAgentIndexes(tenantId: string, deletedDocId: string, documentTitle?: string): Promise<void> {
  try {
    console.log(`🧹 Starting agent index cleanup for document: ${documentTitle || deletedDocId}`);
    
    // Find all agents in this tenant
    const agentsRef = firestore.collection('tenants').doc(tenantId).collection('agents');
    const agentsSnapshot = await agentsRef.get();
    
    if (agentsSnapshot.empty) {
      console.log('📭 No agents found for this tenant');
      return;
    }

    let agentsUpdated = 0;
    let agentsProcessed = 0;

    for (const agentDoc of agentsSnapshot.docs) {
      agentsProcessed++;
      const agentId = agentDoc.id;
      const agentData = agentDoc.data();
      
      console.log(`🔍 Checking agent: ${agentData?.name || agentId}`);

      // Check if this agent references the deleted document
      const knowledgeBaseIndex = agentData?.knowledgeBaseIndex || [];
      const knowledgeBase = agentData?.knowledgeBase || [];
      const knowledgeBaseDocuments = agentData?.knowledgeBaseDocuments || [];

      // Filter out references to the deleted document
      const originalIndexCount = knowledgeBaseIndex.length;
      const originalKbCount = knowledgeBase.length;
      const originalKbDocsCount = knowledgeBaseDocuments.length;

      const cleanedIndex = knowledgeBaseIndex.filter((item: any) => {
        const itemDocId = item?.documentId || item?.id || item?.internalDocumentId;
        return itemDocId !== deletedDocId;
      });

      const cleanedKnowledgeBase = knowledgeBase.filter((item: any) => {
        // Check both internal document ID and 11Labs document ID references
        const itemDocId = item?.documentId || item?.id || item?.internalDocumentId;
        return itemDocId !== deletedDocId;
      });

      const cleanedKbDocuments = knowledgeBaseDocuments.filter((item: any) => {
        const itemDocId = item?.internalDocumentId || item?.documentId;
        return itemDocId !== deletedDocId;
      });

      // Check if any cleanup was needed
      const indexChanged = cleanedIndex.length !== originalIndexCount;
      const kbChanged = cleanedKnowledgeBase.length !== originalKbCount;
      const kbDocsChanged = cleanedKbDocuments.length !== originalKbDocsCount;

      if (indexChanged || kbChanged || kbDocsChanged) {
        console.log(`🧹 Cleaning agent ${agentData?.name || agentId}:`);
        console.log(`  - knowledgeBaseIndex: ${originalIndexCount} → ${cleanedIndex.length}`);
        console.log(`  - knowledgeBase: ${originalKbCount} → ${cleanedKnowledgeBase.length}`);
        console.log(`  - knowledgeBaseDocuments: ${originalKbDocsCount} → ${cleanedKbDocuments.length}`);

        // Update the agent document
        const updateData: any = {
          knowledgeBaseIndex: cleanedIndex,
          knowledgeBase: cleanedKnowledgeBase,
          knowledgeBaseDocuments: cleanedKbDocuments,
          lastKnowledgeBaseCleanup: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await agentDoc.ref.update(updateData);
        agentsUpdated++;

        console.log(`✅ Agent ${agentData?.name || agentId} updated successfully`);
      } else {
        console.log(`📋 Agent ${agentData?.name || agentId} - no references to clean`);
      }
    }

    console.log(`🎯 Agent index cleanup completed:`);
    console.log(`  - Agents processed: ${agentsProcessed}`);
    console.log(`  - Agents updated: ${agentsUpdated}`);
    console.log(`  - Document: ${documentTitle || deletedDocId} (${deletedDocId})`);

  } catch (error) {
    console.error(`❌ Error cleaning up agent indexes for document ${deletedDocId}:`, error);
    // Don't throw - we want the document deletion to succeed even if cleanup partially fails
    console.warn(`⚠️ Document was deleted but some agent index cleanup may have failed`);
  }
}