import { documentClassifier } from './documentUplaods/documentClassifier';
import { documentNormalizer } from './documentUplaods/documentNormalizer';
import { textExtractor } from './documentUplaods/textExtractor';
import { aiReview } from './documentUplaods/aiReview';

export interface UploadedDocumentAnalysis {
  documentId: string;
  fileName: string;
  fileType: string;
  classification: {
    category: string;
    isTextBased: boolean;
    confidence: number;
    extractionMethod: 'direct' | 'vision';
  };
  extractedContent?: string;
  analysis?: {
    summary: string;
    keyPoints: string[];
    suggestedIntegration: string;
    relevantSections: Array<{
      title: string;
      content: string;
      relevance: number;
    }>;
  };
  error?: string;
}

export interface DocumentAnalysisRequest {
  documentId: string;
  downloadUrl: string;
  fileName: string;
  fileType: string;
  tenantId: string;
  autoIntegrate?: boolean;
  targetDocumentId?: string;
}

export const documentUploadService = {
  /**
   * Main document analysis workflow
   */
  analyzeDocument: async (request: DocumentAnalysisRequest): Promise<UploadedDocumentAnalysis> => {
    console.log(`Starting document analysis for: ${request.fileName}`);
    
    const result: UploadedDocumentAnalysis = {
      documentId: request.documentId,
      fileName: request.fileName,
      fileType: request.fileType,
      classification: {
        category: 'unknown',
        isTextBased: false,
        confidence: 0,
        extractionMethod: 'direct'
      }
    };

    try {
      // Step 1: Classify the document
      console.log('Step 1: Classifying document...');
      const classification = await documentClassifier.classifyDocument({
        fileName: request.fileName,
        fileType: request.fileType,
        downloadUrl: request.downloadUrl
      });

      result.classification = classification;
      console.log(`Document classified as: ${classification.category}, text-based: ${classification.isTextBased}`);

      let extractedContent: string;

      if (classification.isTextBased && classification.extractionMethod === 'direct') {
        // Step 2A: Direct text extraction using textExtractor
        console.log('Step 2A: Extracting text directly...');
        extractedContent = await textExtractor.extractText({
          downloadUrl: request.downloadUrl,
          fileName: request.fileName,
          fileType: request.fileType
        });

        // Validate and clean the extracted text
        const validation = textExtractor.validateTextContent(extractedContent);
        if (!validation.valid) {
          console.warn(`Text validation failed: ${validation.message}, falling back to vision processing`);
          extractedContent = await documentNormalizer.normalizeDocument({
            downloadUrl: request.downloadUrl,
            fileName: request.fileName,
            fileType: request.fileType
          });
        } else {
          extractedContent = textExtractor.cleanTextContent(extractedContent);
        }
      } else {
        // Step 2B: Use vision model for content extraction
        console.log('Step 2B: Using vision model for content extraction...');
        extractedContent = await documentNormalizer.normalizeDocument({
          downloadUrl: request.downloadUrl,
          fileName: request.fileName,
          fileType: request.fileType
        });
      }

      if (!extractedContent || extractedContent.trim().length === 0) {
        throw new Error('No content could be extracted from the document');
      }

      result.extractedContent = extractedContent;
      console.log(`Extracted ${extractedContent.length} characters of content`);

      // Step 3: AI Analysis
      console.log('Step 3: Performing AI analysis...');
      const analysis = await aiReview.analyzeContent({
        content: extractedContent,
        fileName: request.fileName,
        fileType: request.fileType,
        documentCategory: classification.category,
        tenantId: request.tenantId,
        targetDocumentId: request.targetDocumentId,
        autoIntegrate: request.autoIntegrate
      });

      result.analysis = analysis;
      console.log('Document analysis completed successfully');

      return result;

    } catch (error) {
      console.error('Error in document analysis workflow:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error occurred';
      return result;
    }
  },

  /**
   * Get document content from URL
   */
  fetchDocumentContent: async (downloadUrl: string): Promise<Buffer> => {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error fetching document content:', error);
      throw new Error('Failed to fetch document content');
    }
  }
};