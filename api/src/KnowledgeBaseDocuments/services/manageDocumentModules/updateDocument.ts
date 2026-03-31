import { firestore } from '../../../config/firebase';
import { KBDocument, UpdateDocumentData } from '../manageDocument';
import { update11LabsKnowledgeBase } from '../11LabsUpdates/update11LabsKnowledgeBase';
import { documentSummarizer } from '../documentSummarizer';

export const updateDocument = async (tenantId: string, docId: string, updateData: UpdateDocumentData): Promise<KBDocument | null> => {
  try {
    console.log('updateDocument called:', {
      tenantId,
      docId,
      updateDataKeys: Object.keys(updateData),
      contentLength: updateData.content?.length,
      contentPreview: updateData.content?.substring(0, 100)
    });

    // Get document reference
    const docRef = firestore.collection('tenants').doc(tenantId).collection('kbDocs').doc(docId);
    
    // Check if document exists
    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      console.log(`Document ${docId} not found for tenant ${tenantId}`);
      return null;
    }

    // Get current document data for summarization
    const currentData = docSnapshot.data();
    
    // Generate new summary if content or title changed
    let newSummary: string | undefined;
    let newKeyPoints: string[] | undefined;
    
    if (updateData.content !== undefined || updateData.title !== undefined) {
      console.log('🔄 Content or title changed, generating new summary...');
      
      try {
        const summaryResult = await documentSummarizer.updateDocumentSummary(
          updateData.title || currentData?.title || '',
          updateData.content || currentData?.content || '',
          updateData.type || currentData?.type,
          updateData.description || currentData?.description
        );
        
        newSummary = summaryResult.summary;
        newKeyPoints = summaryResult.keyPoints;
        
        console.log('✅ New summary generated');
      } catch (error) {
        console.warn('⚠️ Failed to generate new summary:', error);
        // Continue without summary update
      }
    }

    // Prepare update data with timestamp and summary
    const updatePayload = {
      ...updateData,
      ...(newSummary && { summary: newSummary }),
      ...(newKeyPoints && { keyPoints: newKeyPoints }),
      updatedAt: updateData.updatedAt || new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updatePayload).forEach(key => 
      updatePayload[key as keyof typeof updatePayload] === undefined && delete updatePayload[key as keyof typeof updatePayload]
    );

    console.log('Final update payload:', {
      payloadKeys: Object.keys(updatePayload),
      content: updatePayload.content?.substring(0, 100),
      contentLength: updatePayload.content?.length
    });

    // Update the document
    await docRef.update(updatePayload);

    // Fetch and return the updated document
    const updatedSnapshot = await docRef.get();
    const data = updatedSnapshot.data();

    if (!data) {
      throw new Error('Failed to retrieve updated document data');
    }

    const updatedDocument: KBDocument = {
      id: docId,
      title: data.title || '',
      description: data.description || '',
      content: data.content || '',
      type: data.type || 'guide',
      tags: data.tags || [],
      author: data.author || 'Unknown',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      tenantId: tenantId,
      summary: data.summary,
      keyPoints: data.keyPoints
    };

    console.log(`Successfully updated document ${docId} for tenant ${tenantId}`, {
      returnedContentLength: updatedDocument.content.length,
      returnedContentPreview: updatedDocument.content.substring(0, 100)
    });

    // Update 11Labs knowledge base if content was updated
    if (updateData.content !== undefined) {
      console.log('Content was updated, triggering 11Labs knowledge base update');
      
      // Run 11Labs update asynchronously to avoid blocking the response
      update11LabsKnowledgeBase({
        tenantId,
        documentId: docId,
        updatedContent: updatedDocument.content,
        documentTitle: updatedDocument.title
      }).then((result) => {
        if (result.success) {
          console.log(`11Labs update successful for document ${docId}:`, result.message);
        } else {
          console.error(`11Labs update failed for document ${docId}:`, result.error);
        }
      }).catch((error) => {
        console.error(`11Labs update error for document ${docId}:`, error);
      });
    }

    return updatedDocument;

  } catch (error) {
    console.error(`Error updating document ${docId} for tenant ${tenantId}:`, error);
    throw new Error(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};