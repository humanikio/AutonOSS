class ElevenLabsKnowledgeService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 500; // 500ms between requests

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.throttleRequest();
    
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle rate limiting with retry
      if (response.status === 429) {
        console.warn('ElevenLabs rate limit hit, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        throw new Error(`ElevenLabs rate limited: ${response.status} - ${errorText}`);
      }
      
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Handle empty responses (like DELETE requests)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    }
    
    return {};
  }

  // Create knowledge base document from text
  async createKnowledgeBaseFromText(text: string, name?: string): Promise<{id: string, name: string}> {
    try {
      const response = await this.makeRequest('/convai/knowledge-base/text', {
        method: 'POST',
        body: JSON.stringify({
          text,
          name: name || 'Knowledge Base Document'
        }),
      });

      return {
        id: response.id,
        name: response.name
      };
    } catch (error) {
      console.error('Failed to create knowledge base from text:', error);
      throw error;
    }
  }

  // Create knowledge base document from URL
  async createKnowledgeBaseFromUrl(url: string, name?: string): Promise<{id: string, name: string}> {
    try {
      const response = await this.makeRequest('/convai/knowledge-base/url', {
        method: 'POST',
        body: JSON.stringify({
          url,
          name: name || 'Knowledge Base Document'
        }),
      });

      return {
        id: response.id,
        name: response.name
      };
    } catch (error) {
      console.error('Failed to create knowledge base from URL:', error);
      throw error;
    }
  }

  // Delete knowledge base document
  async deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    try {
      await this.makeRequest(`/convai/knowledge-base/${knowledgeBaseId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`Failed to delete knowledge base ${knowledgeBaseId}:`, error);
      throw error;
    }
  }

  // List all knowledge base documents
  async listKnowledgeBases(): Promise<any[]> {
    try {
      const response = await this.makeRequest('/convai/knowledge-base', {
        method: 'GET',
      });
      return response.documents || [];
    } catch (error) {
      console.error('Failed to list knowledge bases:', error);
      throw error;
    }
  }
}

export const elevenlabsKnowledgeService = new ElevenLabsKnowledgeService();