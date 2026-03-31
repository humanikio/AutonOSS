import pdf from 'pdf-parse';

export interface PDFParseRequest {
  downloadUrl: string;
  fileName: string;
}

export interface PDFParseResult {
  text: string;
  numPages: number;
  info: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modDate?: Date;
  };
  metadata: any;
}

export const pdfParser = {
  /**
   * Extract text content from PDF documents
   */
  parsePDF: async (request: PDFParseRequest): Promise<PDFParseResult> => {
    console.log(`Parsing PDF: ${request.fileName}`);

    try {
      // Fetch the PDF file
      const response = await fetch(request.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      // Get PDF as buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Parse PDF
      const data = await pdf(buffer);

      // Validate extracted text
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('No text content could be extracted from PDF');
      }

      console.log(`Successfully extracted ${data.text.length} characters from ${data.numpages} pages`);

      const result: PDFParseResult = {
        text: data.text,
        numPages: data.numpages,
        info: {
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
          creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
          modDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
        },
        metadata: data.metadata || {}
      };

      return result;

    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error(`Failed to parse PDF ${request.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Clean and format extracted PDF text
   */
  cleanPDFText: (text: string): string => {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Fix common PDF extraction issues
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add spaces between camelCase
      .replace(/(\w)(\d)/g, '$1 $2') // Add spaces between letters and numbers
      .replace(/(\d)([A-Za-z])/g, '$1 $2') // Add spaces between numbers and letters
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive blank lines
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
  },

  /**
   * Validate PDF text content quality
   */
  validatePDFText: (text: string): { valid: boolean; message?: string; confidence: number } => {
    if (!text || text.trim().length === 0) {
      return {
        valid: false,
        message: 'No text content extracted',
        confidence: 0
      };
    }

    // Check minimum content length
    if (text.trim().length < 50) {
      return {
        valid: false,
        message: 'Extracted text is too short - PDF may be image-based',
        confidence: 0.1
      };
    }

    // Check for reasonable text-to-special-character ratio
    const textChars = text.match(/[a-zA-Z0-9\s]/g)?.length || 0;
    const totalChars = text.length;
    const textRatio = textChars / totalChars;

    if (textRatio < 0.3) {
      return {
        valid: false,
        message: 'Text quality is poor - may need vision processing',
        confidence: 0.2
      };
    }

    // Check for common PDF extraction artifacts
    const artifactCount = (text.match(/[\u00A0\u2000-\u200F\u2028-\u202F]/g) || []).length;
    const artifactRatio = artifactCount / totalChars;

    let confidence = 1.0;
    if (artifactRatio > 0.1) confidence -= 0.3;
    if (textRatio < 0.7) confidence -= 0.2;
    if (text.length < 200) confidence -= 0.1;

    return {
      valid: textRatio >= 0.3,
      message: confidence < 0.5 ? 'Text quality is moderate - consider manual review' : undefined,
      confidence: Math.max(0, Math.min(1, confidence))
    };
  },

  /**
   * Extract PDF metadata summary
   */
  extractMetadataSummary: (result: PDFParseResult): string => {
    const metadata: string[] = [];

    if (result.info.title) metadata.push(`Title: ${result.info.title}`);
    if (result.info.author) metadata.push(`Author: ${result.info.author}`);
    if (result.info.subject) metadata.push(`Subject: ${result.info.subject}`);
    if (result.numPages) metadata.push(`Pages: ${result.numPages}`);
    if (result.info.creationDate) {
      metadata.push(`Created: ${result.info.creationDate.toLocaleDateString()}`);
    }

    const wordCount = result.text.split(/\s+/).length;
    metadata.push(`Word Count: ~${wordCount}`);

    return metadata.join('\n');
  }
};