export interface TextExtractionRequest {
  downloadUrl: string;
  fileType: string;
  fileName: string;
}

export const textExtractor = {
  /**
   * Extract plain text content from simple text-based documents
   */
  extractText: async (request: TextExtractionRequest): Promise<string> => {
    console.log(`Extracting text from: ${request.fileName} (${request.fileType})`);

    try {
      const response = await fetch(request.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      // For simple text files, just get the text content
      if (request.fileType.startsWith('text/') || 
          request.fileType === 'application/json' ||
          request.fileType === 'application/xml' ||
          request.fileType === 'text/xml') {
        const content = await response.text();
        
        if (!content || content.trim().length === 0) {
          throw new Error('Document appears to be empty');
        }

        console.log(`Successfully extracted ${content.length} characters from ${request.fileName}`);
        return content;
      }

      // For other types, attempt text extraction
      const content = await response.text();
      
      // Basic validation to ensure we got text content, not binary
      if (content.includes('\0') || content.includes('%PDF')) {
        throw new Error('Document appears to contain binary data - use vision processing instead');
      }

      if (!content || content.trim().length === 0) {
        throw new Error('No text content could be extracted from document');
      }

      console.log(`Successfully extracted ${content.length} characters from ${request.fileName}`);
      return content;

    } catch (error) {
      console.error('Error extracting text content:', error);
      throw new Error(`Failed to extract text from ${request.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Validate that extracted content is actually readable text
   */
  validateTextContent: (content: string): { valid: boolean; message?: string } => {
    if (!content || content.trim().length === 0) {
      return {
        valid: false,
        message: 'Content is empty'
      };
    }

    // Check for binary content indicators
    if (content.includes('\0')) {
      return {
        valid: false,
        message: 'Content appears to contain binary data'
      };
    }

    // Check for PDF headers
    if (content.startsWith('%PDF')) {
      return {
        valid: false,
        message: 'Content is PDF binary data'
      };
    }

    // Check minimum content length
    if (content.trim().length < 10) {
      return {
        valid: false,
        message: 'Content is too short to be meaningful'
      };
    }

    // Check for reasonable text-to-special-character ratio
    const textChars = content.match(/[a-zA-Z0-9\s]/g)?.length || 0;
    const totalChars = content.length;
    const textRatio = textChars / totalChars;

    if (textRatio < 0.5) {
      return {
        valid: false,
        message: 'Content has too many non-text characters - may be corrupted or binary'
      };
    }

    return { valid: true };
  },

  /**
   * Clean and normalize extracted text content
   */
  cleanTextContent: (content: string): string => {
    return content
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive blank lines
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
  }
};