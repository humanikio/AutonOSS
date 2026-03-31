import axios from 'axios';
import { updateFirestoreWith11LabsIdArray, checkFirestoreForID } from './checkFirestoreForID';

export interface Create11LabsKBDocumentRequest {
  text: string;
  name?: string;
  // Firestore integration fields
  tenantId?: string;
  documentId?: string;
}

export interface Create11LabsKBDocumentResponse {
  id: string;
  name: string;
}

/**
 * Create a knowledge base document in 11Labs using text content
 */
export async function create11LabsKBDocument(
  request: Create11LabsKBDocumentRequest
): Promise<Create11LabsKBDocumentResponse> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    console.log(`Creating 11Labs knowledge base document: ${request.name || 'Unnamed'}`);
    console.log(`Content length: ${request.text.length} characters`);

    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/knowledge-base/text',
      {
        text: request.text,
        name: request.name
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    if (response.status !== 200) {
      throw new Error(`11Labs API returned status ${response.status}: ${response.statusText}`);
    }

    const result = response.data as Create11LabsKBDocumentResponse;
    
    console.log(`Successfully created 11Labs knowledge base document with ID: ${result.id}`);
    
    // If Firestore integration fields are provided, update the document with the new ID
    if (request.tenantId && request.documentId) {
      console.log(`Updating Firestore with new 11Labs document ID: ${result.id}`);
      
      // Get current ID array from Firestore
      const firestoreCheck = await checkFirestoreForID(request.tenantId, request.documentId);
      
      // Create new array with the new ID at the front
      const currentIds = firestoreCheck.elevenLabsKnowledgeBaseDocIds || [];
      const updatedIds = [result.id, ...currentIds];
      
      // Update Firestore with the new array
      await updateFirestoreWith11LabsIdArray(request.tenantId, request.documentId, updatedIds);
      
      console.log(`Successfully updated Firestore with ID array:`, updatedIds);
    }
    
    return result;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('11Labs API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 422) {
        throw new Error(`11Labs validation error: ${JSON.stringify(error.response.data)}`);
      } else if (error.response?.status === 401) {
        throw new Error('11Labs API authentication failed. Check your API key.');
      } else if (error.response?.status === 429) {
        throw new Error('11Labs API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`11Labs API error (${error.response?.status}): ${error.response?.statusText || error.message}`);
      }
    }
    
    console.error('Error creating 11Labs knowledge base document:', error);
    throw new Error(`Failed to create 11Labs document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}