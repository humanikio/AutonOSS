export interface DocumentClassification {
  category: string;
  isTextBased: boolean;
  confidence: number;
  extractionMethod: 'direct' | 'vision';
}

export interface ClassificationRequest {
  fileName: string;
  fileType: string;
  downloadUrl: string;
}

export const documentClassifier = {
  /**
   * Classify document based on file type and content inspection
   */
  classifyDocument: async (request: ClassificationRequest): Promise<DocumentClassification> => {
    const { fileName, fileType } = request;
    
    console.log(`Classifying document: ${fileName}, type: ${fileType}`);

    // Text-based file types that can be directly extracted
    const textBasedTypes = [
      'text/plain',
      'text/markdown',
      'text/html',
      'text/csv',
      'application/json',
      'application/xml',
      'text/xml'
    ];

    // Document types that require vision analysis (no direct text extraction implemented)
    const visionDocumentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/rtf'
    ];

    // Image types that require vision analysis
    const imageTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ];

    let classification: DocumentClassification = {
      category: 'unknown',
      isTextBased: false,
      confidence: 0.5,
      extractionMethod: 'vision'
    };

    if (textBasedTypes.includes(fileType)) {
      classification = {
        category: 'text',
        isTextBased: true,
        confidence: 0.9,
        extractionMethod: 'direct'
      };
    } else if (visionDocumentTypes.includes(fileType)) {
      classification = {
        category: 'document',
        isTextBased: false,
        confidence: 0.8,
        extractionMethod: 'vision'
      };
    } else if (imageTypes.includes(fileType)) {
      classification = {
        category: 'image',
        isTextBased: false,
        confidence: 0.85,
        extractionMethod: 'vision'
      };
    } else {
      // Try to infer from file extension if MIME type is not helpful
      const extension = fileName.toLowerCase().split('.').pop();
      
      if (extension) {
        if (['txt', 'md', 'html', 'csv', 'json', 'xml'].includes(extension)) {
          classification = {
            category: 'text',
            isTextBased: true,
            confidence: 0.7,
            extractionMethod: 'direct'
          };
        } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf'].includes(extension)) {
          classification = {
            category: 'document',
            isTextBased: false,
            confidence: 0.7,
            extractionMethod: 'vision'
          };
        } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
          classification = {
            category: 'image',
            isTextBased: false,
            confidence: 0.7,
            extractionMethod: 'vision'
          };
        }
      }
    }

    console.log(`Document classified:`, classification);
    return classification;
  },

};