import { update11LabsKnowledgeBase } from './update11LabsKnowledgeBase';

/**
 * Test script for 11Labs integration
 * This can be used to test the complete flow
 */
export async function test11LabsIntegration() {
  try {
    console.log('Testing 11Labs integration...');

    const testRequest = {
      tenantId: 'test-tenant',
      documentId: 'test-document',
      updatedContent: 'This is a test document content for 11Labs knowledge base integration. It contains enough text to pass validation.',
      documentTitle: 'Test Document for 11Labs'
    };

    const result = await update11LabsKnowledgeBase(testRequest);

    console.log('Test Result:', {
      success: result.success,
      message: result.message,
      operation: result.operation,
      elevenLabsDocumentId: result.elevenLabsDocumentId,
      connectedAgentsCount: result.connectedAgentsCount,
      agentUpdateResults: result.agentUpdateResults,
      error: result.error
    });

    return result;

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Uncomment to run test directly
// test11LabsIntegration().then(result => {
//   console.log('Test completed:', result);
// }).catch(error => {
//   console.error('Test error:', error);
// });