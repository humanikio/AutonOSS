import { claude4 } from '../../../llmModels/claude4';
import { pdfParser } from './pdfParser';

export interface NormalizationRequest {
  downloadUrl: string;
  fileName: string;
  fileType: string;
}

export const documentNormalizer = {
  /**
   * Normalize document content using the appropriate method
   */
  normalizeDocument: async (request: NormalizationRequest): Promise<string> => {
    console.log(`Normalizing document: ${request.fileName} (${request.fileType})`);

    // Handle PDF files with dedicated PDF parser
    if (request.fileType === 'application/pdf' || request.fileName.toLowerCase().endsWith('.pdf')) {
      return await documentNormalizer.handlePDFDocument(request);
    }

    // Handle other document types with vision processing
    return await documentNormalizer.handleVisionDocument(request);
  },

  /**
   * Handle PDF documents using PDF parser
   */
  handlePDFDocument: async (request: NormalizationRequest): Promise<string> => {
    console.log(`Processing PDF with text extraction: ${request.fileName}`);

    try {
      // First, try PDF text extraction
      const pdfResult = await pdfParser.parsePDF({
        downloadUrl: request.downloadUrl,
        fileName: request.fileName
      });

      // Validate the extracted text quality
      const validation = pdfParser.validatePDFText(pdfResult.text);
      
      if (validation.valid && validation.confidence > 0.5) {
        console.log(`PDF text extraction successful with confidence: ${validation.confidence}`);
        
        // Clean and format the text
        const cleanedText = pdfParser.cleanPDFText(pdfResult.text);
        
        // Add metadata summary
        const metadataSummary = pdfParser.extractMetadataSummary(pdfResult);
        
        return `${metadataSummary}\n\n--- Document Content ---\n\n${cleanedText}`;
      } else {
        console.warn(`PDF text quality is poor (confidence: ${validation.confidence}), falling back to vision processing`);
        console.warn(`Validation message: ${validation.message}`);
        
        // Fall back to vision processing for poor quality text extraction
        return await documentNormalizer.handleVisionDocument(request);
      }

    } catch (error) {
      console.error('PDF parsing failed, falling back to vision processing:', error);
      // Fall back to vision processing if PDF parsing fails
      return await documentNormalizer.handleVisionDocument(request);
    }
  },

  /**
   * Handle documents using Claude Vision
   */
  handleVisionDocument: async (request: NormalizationRequest): Promise<string> => {
    console.log(`Processing document with Claude Vision: ${request.fileName}`);

    try {
      // Fetch the document as base64 for Claude Vision
      const response = await fetch(request.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Content = buffer.toString('base64');

      // Determine media type for Claude (force to supported image format for PDFs)
      let mediaType = 'image/jpeg'; // Default fallback
      
      if (request.fileType.startsWith('image/')) {
        // Use original image type if it's supported
        const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (supportedTypes.includes(request.fileType)) {
          mediaType = request.fileType;
        }
      }

      // Create vision prompt for Claude
      const visionPrompt = `
Please analyze this document and extract all text content and key information.

Document: ${request.fileName}
Type: ${request.fileType}

Please provide:
1. All readable text content from the document
2. Document structure and organization
3. Key sections, headers, and important information
4. Any tables, lists, or structured data
5. Overall document purpose and type

Format your response as structured text that preserves the document's organization and hierarchy.
If this is a form, extract field names and any filled values.
If this is a policy or procedure, extract the main points and steps.
If this is technical documentation, extract the key technical details.

Focus on extracting useful, actionable information that could be integrated into knowledge base documents.
`;

      // Call Claude Vision
      const result = await claude4.analyzeImage({
        imageData: base64Content,
        mediaType: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        prompt: visionPrompt
      });

      if (!result || result.trim().length === 0) {
        throw new Error('No content extracted from document vision analysis');
      }

      console.log(`Vision analysis completed, extracted ${result.length} characters`);
      return result;

    } catch (error) {
      console.error('Error in vision document processing:', error);
      throw new Error(`Failed to process document with vision: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Fallback method for simple image text extraction
   */
  extractImageText: async (downloadUrl: string): Promise<string> => {
    console.log('Extracting text from image using basic vision analysis');

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Content = buffer.toString('base64');

      const prompt = `
Please extract all text content from this image. 
Preserve the structure and formatting as much as possible.
If there are multiple sections or columns, organize them clearly.
Return only the extracted text content.
`;

      const result = await claude4.analyzeImage({
        imageData: base64Content,
        mediaType: 'image/jpeg',
        prompt: prompt
      });

      return result || '';

    } catch (error) {
      console.error('Error extracting image text:', error);
      throw new Error('Failed to extract text from image');
    }
  }
};