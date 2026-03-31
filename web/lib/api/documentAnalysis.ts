import { UploadedDocument } from '@/lib/services/documentUpload';
import apiClient from './client';

export interface DocumentAnalysisResult {
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
    documentUpdateResult?: {
      success: boolean;
      message: string;
      updatedAt: string;
    };
  };
  error?: string;
}

export interface AnalyzeDocumentOptions {
  autoIntegrate?: boolean;
  targetDocumentId?: string;
}

export async function analyzeUploadedDocument(document: UploadedDocument, options?: AnalyzeDocumentOptions): Promise<DocumentAnalysisResult> {
  try {
    console.log('Sending document analysis request:', {
      documentId: document.id,
      fileName: document.originalName,
      fileType: document.fileType,
      autoIntegrate: options?.autoIntegrate,
      targetDocumentId: options?.targetDocumentId
    });

    const response = await apiClient.post('/api/kb/documents/analyze-upload', {
      documentId: document.id,
      downloadUrl: document.downloadUrl,
      fileName: document.originalName,
      fileType: document.fileType,
      autoIntegrate: options?.autoIntegrate,
      targetDocumentId: options?.targetDocumentId
    });

    console.log('Received analysis response:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Analysis failed');
    }

    return response.data.data;
  } catch (error: any) {
    console.error('Error analyzing document:', error);
    
    // Log more details about the error
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    }
    
    // Handle axios error response
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw new Error(error.message || 'Failed to analyze document');
  }
}