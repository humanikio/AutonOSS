import { checkFirestoreForID, updateFirestoreWith11LabsIdArray } from './checkFirestoreForID';
import { create11LabsKBDocument } from './create11LabsKbDocument';
import { deleteOld11LabsDoc } from './editExisting/deleteOld11LabsDoc';
import { findConnectedAgents, getConnectedAgentsSummary } from './editExisting/findConnectedAgents';
import { connectToExistingAgents } from './editExisting/connectToExistingAgents';

export interface Update11LabsKnowledgeBaseRequest {
  tenantId: string;
  documentId: string;
  updatedContent: string;
  documentTitle: string;
}

export interface Update11LabsKnowledgeBaseResult {
  success: boolean;
  message: string;
  elevenLabsDocumentId?: string;
  operation: 'created' | 'updated' | 'skipped';
  connectedAgentsCount?: number;
  agentUpdateResults?: {
    updatedAgents: string[];
    failedAgents: { agentId: string; error: string; }[];
  };
  error?: string;
}

/**
 * Main orchestrator for updating 11Labs knowledge base documents with versioning and agent migration
 * This function handles the complete flow with zero-downtime updates
 */
export async function update11LabsKnowledgeBase(
  request: Update11LabsKnowledgeBaseRequest
): Promise<Update11LabsKnowledgeBaseResult> {
  try {
    const { tenantId, documentId, updatedContent, documentTitle } = request;

    console.log(`Starting 11Labs knowledge base update for document: ${documentId}`);

    // Step 1: Check if document exists and has 11Labs ID
    const firestoreCheck = await checkFirestoreForID(tenantId, documentId);

    if (!firestoreCheck.exists) {
      return {
        success: false,
        message: 'Firestore document not found',
        operation: 'skipped',
        error: 'Document does not exist in Firestore'
      };
    }

    // Skip if content is empty or too short
    if (!isContentValid(updatedContent)) {
      console.log('Skipping 11Labs update - content invalid or too short');
      return {
        success: true,
        message: 'Skipped 11Labs update - content invalid',
        operation: 'skipped'
      };
    }

    // Branch A: No existing 11Labs ID (First time)
    if (!firestoreCheck.hasAnyElevenLabsId) {
      console.log('No existing 11Labs ID found - creating first document');
      
      const createResult = await create11LabsKBDocument({
        text: updatedContent,
        name: `${tenantId}-${documentId}`,
        tenantId,
        documentId
      });

      console.log(`Successfully created first 11Labs document with ID: ${createResult.id}`);

      return {
        success: true,
        message: 'Successfully created first 11Labs knowledge base document',
        elevenLabsDocumentId: createResult.id,
        operation: 'created'
      };
    }

    // Branch B: Existing 11Labs ID exists (Update scenario)
    console.log('Existing 11Labs ID found - performing versioned update');
    
    const previousDocId = firestoreCheck.currentElevenLabsId;
    console.log(`Previous document ID: ${previousDocId}`);

    // Step 2: Create new 11Labs document with updated content
    console.log('Creating new 11Labs knowledge base document');
    const createResult = await create11LabsKBDocument({
      text: updatedContent,
      name: `${tenantId}-${documentId}`,
      tenantId,
      documentId
    });

    const newDocId = createResult.id;
    console.log(`Successfully created new 11Labs document with ID: ${newDocId}`);

    // Step 3: Check if previous document has connected agents
    let connectedAgents = [];
    let agentUpdateResults = undefined;

    if (previousDocId) {
      console.log('Checking for connected agents on previous document');
      connectedAgents = await findConnectedAgents(previousDocId);
      const agentsSummary = getConnectedAgentsSummary(connectedAgents);
      console.log(`Connected agents check: ${agentsSummary}`);

      // Step 4: Connect agents to new document (if any exist)
      if (connectedAgents.length > 0) {
        console.log(`Migrating ${connectedAgents.length} connected agents to new document`);
        const connectResult = await connectToExistingAgents(
          connectedAgents,
          previousDocId,
          newDocId
        );

        agentUpdateResults = {
          updatedAgents: connectResult.updatedAgents,
          failedAgents: connectResult.failedAgents
        };

        console.log(`Agent migration result: ${connectResult.message}`);

        if (!connectResult.success && connectResult.failedAgents.length > 0) {
          console.warn('Some agents failed to update, but continuing with cleanup');
        }
      }

      // Step 5: Delete old document (with delay to ensure agent updates are processed)
      try {
        console.log(`Deleting old 11Labs document: ${previousDocId}`);
        console.log('Waiting 2 seconds for 11Labs to process agent updates...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await deleteOld11LabsDoc(previousDocId, { force: false });
        console.log('Successfully deleted old 11Labs document');
      } catch (deleteError) {
        console.warn('Failed to delete old 11Labs document:', deleteError);
        // Don't fail the whole operation if cleanup fails
      }
    }

    console.log(`Successfully completed versioned 11Labs knowledge base update for document ${documentId}`);

    return {
      success: true,
      message: `Successfully updated 11Labs knowledge base document with ${connectedAgents.length} agent migrations`,
      elevenLabsDocumentId: newDocId,
      operation: 'updated',
      connectedAgentsCount: connectedAgents.length,
      agentUpdateResults
    };

  } catch (error) {
    console.error('Error updating 11Labs knowledge base:', error);
    
    return {
      success: false,
      message: 'Failed to update 11Labs knowledge base',
      operation: 'skipped',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Helper function to validate if content is suitable for 11Labs
 */
function isContentValid(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const trimmed = content.trim();
  
  // Must have at least 10 characters
  if (trimmed.length < 10) {
    return false;
  }

  // Must not be too long (11Labs likely has limits)
  if (trimmed.length > 100000) {
    console.warn('Content is very long, may exceed 11Labs limits');
  }

  return true;
}