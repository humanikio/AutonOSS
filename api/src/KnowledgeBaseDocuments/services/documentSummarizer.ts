import { claude4 } from '../../llmModels/claude4';

export interface DocumentSummary {
  summary: string;
  keyPoints: string[];
}

export interface SummarizeRequest {
  title: string;
  content: string;
  type?: string;
  description?: string;
}

export class DocumentSummarizer {
  /**
   * Generate summary and key points for a document
   */
  async summarizeDocument(request: SummarizeRequest): Promise<DocumentSummary> {
    try {
      console.log(`📝 Generating summary for document: ${request.title}`);

      const prompt = this.buildSummarizationPrompt(request);
      const response = await claude4.processText(prompt);

      // Parse JSON response
      let summaryData: DocumentSummary;
      try {
        summaryData = JSON.parse(response);
      } catch (parseError) {
        console.warn('Failed to parse JSON response, extracting manually');
        summaryData = this.extractSummaryFromText(response);
      }

      // Validate and clean up the response
      summaryData = this.validateAndCleanSummary(summaryData);

      console.log('✅ Document summary generated:', {
        summaryLength: summaryData.summary.length,
        keyPointsCount: summaryData.keyPoints.length
      });

      return summaryData;

    } catch (error) {
      console.error('Error generating document summary:', error);
      
      // Return fallback summary
      return this.createFallbackSummary(request);
    }
  }

  /**
   * Build the summarization prompt
   */
  private buildSummarizationPrompt(request: SummarizeRequest): string {
    return `You are a knowledge management assistant tasked with creating concise summaries of documents for AI agents and customer service representatives.

Document Information:
- Title: ${request.title}
- Type: ${request.type || 'document'}
${request.description ? `- Description: ${request.description}` : ''}

Content to summarize:
${request.content}

Please analyze this document and provide a JSON response with the following structure:
{
  "summary": "A clear, informative 2-3 sentence summary of the document's main purpose, key information, and value for customer service",
  "keyPoints": ["Array of 5-10 specific, actionable key points that capture the most important information from this document"]
}

Guidelines:
1. Summary should be professional and focus on what customer service agents need to know
2. Key points should be specific, actionable insights rather than generic statements  
3. Prioritize information that would help in customer interactions
4. Include any important procedures, policies, or reference information
5. Make it easy for agents to quickly understand the document's value and content
6. Focus on practical applications and use cases

Respond only with valid JSON.`;
  }

  /**
   * Extract summary from text response if JSON parsing fails
   */
  private extractSummaryFromText(response: string): DocumentSummary {
    const lines = response.split('\n');
    let summary = '';
    const keyPoints: string[] = [];

    let inSummary = false;
    let inKeyPoints = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('summary')) {
        inSummary = true;
        inKeyPoints = false;
        continue;
      }
      
      if (trimmedLine.toLowerCase().includes('key') && trimmedLine.toLowerCase().includes('point')) {
        inSummary = false;
        inKeyPoints = true;
        continue;
      }

      if (inSummary && trimmedLine.length > 0 && !trimmedLine.startsWith('{') && !trimmedLine.startsWith('"')) {
        summary += trimmedLine + ' ';
      }

      if (inKeyPoints && (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.startsWith('*'))) {
        keyPoints.push(trimmedLine.substring(1).trim());
      }
    }

    return {
      summary: summary.trim() || 'Document content processed',
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Document contains relevant information']
    };
  }

  /**
   * Validate and clean up the summary response
   */
  private validateAndCleanSummary(data: any): DocumentSummary {
    const cleaned: DocumentSummary = {
      summary: '',
      keyPoints: []
    };

    // Validate summary
    if (typeof data.summary === 'string' && data.summary.trim().length > 0) {
      cleaned.summary = data.summary.trim();
    } else {
      cleaned.summary = 'Document contains important information for customer service operations.';
    }

    // Validate key points
    if (Array.isArray(data.keyPoints)) {
      cleaned.keyPoints = data.keyPoints
        .filter((point: any) => typeof point === 'string' && point.trim().length > 0)
        .map((point: string) => point.trim())
        .slice(0, 10); // Limit to 10 points
    }

    // Ensure we have at least some key points
    if (cleaned.keyPoints.length === 0) {
      cleaned.keyPoints = ['Contains relevant information for customer service'];
    }

    return cleaned;
  }

  /**
   * Create fallback summary when AI processing fails
   */
  private createFallbackSummary(request: SummarizeRequest): DocumentSummary {
    const contentLength = request.content.length;
    const wordCount = request.content.split(/\s+/).length;

    return {
      summary: `This ${request.type || 'document'} titled "${request.title}" contains ${wordCount} words of content relevant to customer service operations. The content has been processed and is available for agent reference.`,
      keyPoints: [
        `Document type: ${request.type || 'document'}`,
        `Content length: ${wordCount} words`,
        'Contains information relevant to customer service',
        'Available for agent reference and guidance',
        'May include procedures, policies, or reference information'
      ]
    };
  }

  /**
   * Update existing document with new summary (used during edits)
   */
  async updateDocumentSummary(
    title: string,
    content: string,
    type?: string,
    description?: string
  ): Promise<DocumentSummary> {
    console.log(`🔄 Updating summary for document: ${title}`);
    
    return await this.summarizeDocument({
      title,
      content,
      type,
      description
    });
  }
}

export const documentSummarizer = new DocumentSummarizer();