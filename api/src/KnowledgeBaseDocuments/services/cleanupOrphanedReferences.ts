import { firestore } from '../../config/firebase';

export interface CleanupResult {
  success: boolean;
  totalAgentsProcessed: number;
  agentsUpdated: number;
  totalOrphanedReferences: number;
  existingDocuments: number;
  orphanedReferences: Array<{
    agentId: string;
    agentName: string;
    orphanedDocIds: string[];
    referencesRemoved: number;
  }>;
  error?: string;
}

/**
 * Clean up orphaned document references in all agent knowledge base indexes for a tenant
 */
export async function cleanupOrphanedDocumentReferences(tenantId: string): Promise<CleanupResult> {
  console.log(`🔍 Starting orphaned document reference cleanup for tenant: ${tenantId}`);
  
  try {
    // Step 1: Get all existing document IDs
    console.log('📚 Step 1: Loading all existing documents...');
    const docsRef = firestore.collection('tenants').doc(tenantId).collection('kbDocs');
    const docsSnapshot = await docsRef.get();
    
    const existingDocIds = new Set<string>();
    docsSnapshot.forEach(doc => {
      existingDocIds.add(doc.id);
    });
    
    console.log(`✅ Found ${existingDocIds.size} existing documents`);

    // Step 2: Check all agents for orphaned references
    console.log('🤖 Step 2: Checking agents for orphaned references...');
    const agentsRef = firestore.collection('tenants').doc(tenantId).collection('agents');
    const agentsSnapshot = await agentsRef.get();
    
    if (agentsSnapshot.empty) {
      console.log('📭 No agents found for this tenant');
      return {
        success: true,
        totalAgentsProcessed: 0,
        agentsUpdated: 0,
        totalOrphanedReferences: 0,
        existingDocuments: existingDocIds.size,
        orphanedReferences: []
      };
    }

    let totalAgentsProcessed = 0;
    let totalAgentsUpdated = 0;
    let totalOrphanedReferences = 0;
    const orphanedReferences: CleanupResult['orphanedReferences'] = [];

    for (const agentDoc of agentsSnapshot.docs) {
      totalAgentsProcessed++;
      const agentId = agentDoc.id;
      const agentData = agentDoc.data();
      const agentName = agentData?.name || agentId;
      
      console.log(`🔍 Checking agent: ${agentName} (${agentId})`);

      // Check knowledge base index
      const knowledgeBaseIndex = agentData?.knowledgeBaseIndex || [];
      const knowledgeBase = agentData?.knowledgeBase || [];
      const knowledgeBaseDocuments = agentData?.knowledgeBaseDocuments || [];

      // Find orphaned references
      const orphanedDocIds = new Set<string>();
      
      // Check all three knowledge base collections for orphaned references
      [...knowledgeBaseIndex, ...knowledgeBase, ...knowledgeBaseDocuments].forEach(item => {
        const docId = item?.documentId || item?.id || item?.internalDocumentId;
        if (docId && !existingDocIds.has(docId)) {
          orphanedDocIds.add(docId);
        }
      });

      if (orphanedDocIds.size > 0) {
        console.log(`  ⚠️  Found ${orphanedDocIds.size} orphaned document references`);
        
        // Clean up orphaned references
        const cleanedIndex = knowledgeBaseIndex.filter((item: any) => {
          const docId = item?.documentId || item?.id || item?.internalDocumentId;
          return !docId || existingDocIds.has(docId);
        });

        const cleanedKnowledgeBase = knowledgeBase.filter((item: any) => {
          const docId = item?.documentId || item?.id || item?.internalDocumentId;
          return !docId || existingDocIds.has(docId);
        });

        const cleanedKbDocuments = knowledgeBaseDocuments.filter((item: any) => {
          const docId = item?.internalDocumentId || item?.documentId;
          return !docId || existingDocIds.has(docId);
        });

        const originalTotalRefs = knowledgeBaseIndex.length + knowledgeBase.length + knowledgeBaseDocuments.length;
        const cleanedTotalRefs = cleanedIndex.length + cleanedKnowledgeBase.length + cleanedKbDocuments.length;
        const referencesRemoved = originalTotalRefs - cleanedTotalRefs;

        // Update the agent
        const updateData = {
          knowledgeBaseIndex: cleanedIndex,
          knowledgeBase: cleanedKnowledgeBase,
          knowledgeBaseDocuments: cleanedKbDocuments,
          lastOrphanedCleanup: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await agentDoc.ref.update(updateData);
        totalAgentsUpdated++;
        totalOrphanedReferences += referencesRemoved;

        orphanedReferences.push({
          agentId,
          agentName,
          orphanedDocIds: Array.from(orphanedDocIds),
          referencesRemoved
        });

        console.log(`  ✅ Cleaned up ${referencesRemoved} orphaned references for ${agentName}`);
      } else {
        console.log(`  ✅ No orphaned references found for ${agentName}`);
      }
    }

    console.log(`🎯 Cleanup completed: ${totalOrphanedReferences} orphaned references cleaned from ${totalAgentsUpdated}/${totalAgentsProcessed} agents`);

    return {
      success: true,
      totalAgentsProcessed,
      agentsUpdated: totalAgentsUpdated,
      totalOrphanedReferences,
      existingDocuments: existingDocIds.size,
      orphanedReferences
    };

  } catch (error) {
    console.error('❌ Error during orphaned reference cleanup:', error);
    return {
      success: false,
      totalAgentsProcessed: 0,
      agentsUpdated: 0,
      totalOrphanedReferences: 0,
      existingDocuments: 0,
      orphanedReferences: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}