import axios from 'axios';

export interface Delete11LabsDocumentOptions {
  force?: boolean;
}

/**
 * Delete a knowledge base document from 11Labs
 */
export async function deleteOld11LabsDoc(
  documentationId: string,
  options: Delete11LabsDocumentOptions = {}
): Promise<void> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    console.log(`Deleting 11Labs knowledge base document: ${documentationId}`);

    const response = await axios.delete(
      `https://api.elevenlabs.io/v1/convai/knowledge-base/${documentationId}`,
      {
        headers: {
          'xi-api-key': apiKey
        },
        params: {
          force: options.force || false
        },
        timeout: 30000 // 30 second timeout
      }
    );

    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`11Labs API returned status ${response.status}: ${response.statusText}`);
    }

    console.log(`Successfully deleted 11Labs knowledge base document: ${documentationId}`);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('11Labs API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 404) {
        console.log(`11Labs document ${documentationId} not found - may have been already deleted`);
        return; // Treat as success since the document doesn't exist
      } else if (error.response?.status === 422) {
        throw new Error(`11Labs validation error: ${JSON.stringify(error.response.data)}`);
      } else if (error.response?.status === 401) {
        throw new Error('11Labs API authentication failed. Check your API key.');
      } else if (error.response?.status === 429) {
        throw new Error('11Labs API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`11Labs API error (${error.response?.status}): ${error.response?.statusText || error.message}`);
      }
    }
    
    console.error('Error deleting 11Labs knowledge base document:', error);
    throw new Error(`Failed to delete 11Labs document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}