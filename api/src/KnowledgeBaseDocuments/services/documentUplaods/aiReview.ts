import { claude4 } from '../../../llmModels/claude4';
import { aiEditDocumentTool } from '../../tools/aiEditDocument';

export interface ContentAnalysis {
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
}

export interface AnalysisRequest {
  content: string;
  fileName: string;
  fileType: string;
  documentCategory: string;
  targetDocumentId?: string;
  tenantId?: string;
  autoIntegrate?: boolean;
}

export const aiReview = {
  /**
   * Analyze extracted content and optionally integrate into target document
   */
  analyzeContent: async (request: AnalysisRequest): Promise<ContentAnalysis> => {
    console.log(`Analyzing content from: ${request.fileName}`);

    try {
      const analysisPrompt = `
You are an expert document analyzer helping to integrate content into a knowledge base system.

Document Information:
- Name: ${request.fileName}
- Type: ${request.fileType}
- Category: ${request.documentCategory}

Content to analyze:
${request.content}

Please provide a comprehensive analysis in the following JSON format:
{
  "summary": "Brief 2-3 sentence summary of the document's main purpose and content",
  "keyPoints": ["List of 5-10 key points or takeaways from the document"],
  "suggestedIntegration": "Specific recommendations on how this content could be integrated into knowledge base documents (e.g., which sections to add, how to structure it)",
  "relevantSections": [
    {
      "title": "Section name/header",
      "content": "The actual content of this section",
      "relevance": 0.9
    }
  ]
}

Guidelines for analysis:
1. Focus on actionable information that would be valuable in training materials
2. Identify procedures, policies, guidelines, best practices, or reference information
3. Rate section relevance from 0.0 to 1.0 based on usefulness for knowledge base integration
4. Break down complex documents into logical sections
5. Highlight any compliance requirements, safety procedures, or critical processes
6. Consider how this content would help AI agents provide better responses

Return only valid JSON without any markdown formatting or additional text.
`;

      const response = await claude4.sendMessage([
        {
          role: 'user',
          content: analysisPrompt
        }
      ]);

      // Parse the JSON response
      let analysisResult: ContentAnalysis;
      try {
        // Remove any potential markdown formatting
        const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
        analysisResult = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('Error parsing AI analysis response:', parseError);
        console.log('Raw response:', response);
        
        // Fallback to basic analysis
        analysisResult = {
          summary: `Document analysis for ${request.fileName}. Content extracted but detailed analysis failed.`,
          keyPoints: ['Content extracted from uploaded document', 'Manual review recommended'],
          suggestedIntegration: 'Review the extracted content and manually integrate relevant sections into your knowledge base documents.',
          relevantSections: [{
            title: 'Full Content',
            content: request.content.substring(0, 1000) + (request.content.length > 1000 ? '...' : ''),
            relevance: 0.7
          }]
        };
      }

      // Validate and clean the result
      if (!analysisResult.summary) analysisResult.summary = 'Analysis completed';
      if (!Array.isArray(analysisResult.keyPoints)) analysisResult.keyPoints = [];
      if (!analysisResult.suggestedIntegration) analysisResult.suggestedIntegration = 'Review and integrate manually';
      if (!Array.isArray(analysisResult.relevantSections)) analysisResult.relevantSections = [];

      // Ensure relevance scores are valid numbers
      analysisResult.relevantSections = analysisResult.relevantSections.map(section => ({
        ...section,
        relevance: typeof section.relevance === 'number' ? Math.max(0, Math.min(1, section.relevance)) : 0.5
      }));

      // Auto-integrate if requested
      if (request.autoIntegrate && request.targetDocumentId && request.tenantId) {
        try {
          const integrationContent = await aiReview.prepareIntegrationContent(analysisResult, request.content);
          const updateResult = await aiEditDocumentTool.updateDocument({
            tenantId: request.tenantId,
            docId: request.targetDocumentId,
            content: integrationContent,
            reason: `Auto-integrated content from uploaded document: ${request.fileName}`
          });
          
          analysisResult.documentUpdateResult = updateResult;
          console.log(`Auto-integration result for ${request.fileName}:`, updateResult.success ? 'Success' : 'Failed');
        } catch (integrationError) {
          console.error('Error during auto-integration:', integrationError);
          analysisResult.documentUpdateResult = {
            success: false,
            message: `Auto-integration failed: ${integrationError instanceof Error ? integrationError.message : 'Unknown error'}`,
            updatedAt: new Date().toISOString()
          };
        }
      }

      console.log(`Content analysis completed for ${request.fileName}`);
      return analysisResult;

    } catch (error) {
      console.error('Error in AI content analysis:', error);
      
      // Return a fallback analysis
      return {
        summary: `Error analyzing ${request.fileName}. Content was extracted but detailed analysis failed.`,
        keyPoints: ['Content extraction successful', 'AI analysis encountered an error', 'Manual review recommended'],
        suggestedIntegration: 'Please review the extracted content manually and integrate relevant information into your knowledge base.',
        relevantSections: [{
          title: 'Extracted Content',
          content: request.content.substring(0, 500) + (request.content.length > 500 ? '...' : ''),
          relevance: 0.5
        }]
      };
    }
  },

  /**
   * Prepare content for integration into target document
   */
  prepareIntegrationContent: async (analysis: ContentAnalysis, originalContent: string): Promise<string> => {
    const integrationPrompt = `
Based on the following analysis, prepare well-formatted content for integration into a knowledge base document:

Analysis Summary: ${analysis.summary}

Key Points:
${analysis.keyPoints.map(point => `- ${point}`).join('\n')}

Relevant Sections:
${analysis.relevantSections.map(section => `## ${section.title}\n${section.content}`).join('\n\n')}

Please create a well-structured, markdown-formatted version that:
1. Has clear headings and organization
2. Integrates the key points naturally
3. Is ready to append to an existing knowledge base document
4. Maintains professional tone and formatting
5. Includes only the most relevant information (relevance > 0.6)

Return only the formatted content without any explanation or metadata.
`;

    try {
      const formattedContent = await claude4.sendMessage([
        {
          role: 'user',
          content: integrationPrompt
        }
      ]);

      return formattedContent.trim();
    } catch (error) {
      console.error('Error preparing integration content:', error);
      
      // Fallback to basic formatting
      let fallbackContent = `\n\n## Uploaded Content: ${analysis.summary}\n\n`;
      fallbackContent += `### Key Points\n${analysis.keyPoints.map(point => `- ${point}`).join('\n')}\n\n`;
      
      // Add high-relevance sections
      const highRelevanceSections = analysis.relevantSections.filter(section => section.relevance > 0.6);
      if (highRelevanceSections.length > 0) {
        fallbackContent += highRelevanceSections.map(section => `### ${section.title}\n${section.content}`).join('\n\n');
      }
      
      return fallbackContent;
    }
  },

  /**
   * Generate suggestions for specific integration into KB documents
   */
  generateIntegrationSuggestions: async (content: string, targetDocumentType: string): Promise<string[]> => {
    console.log(`Generating integration suggestions for ${targetDocumentType} document`);

    try {
      const prompt = `
Based on the following content, suggest specific ways to integrate it into a ${targetDocumentType} knowledge base document:

Content:
${content}

Provide 5-10 specific integration suggestions such as:
- Add as a new section titled "..."
- Update existing procedure step X with this information
- Create a reference table for these values
- Add this as a troubleshooting guide
- Include as best practice examples

Return as a JSON array of strings.
`;

      const response = await claude4.sendMessage([
        {
          role: 'user',
          content: prompt
        }
      ]);

      try {
        const suggestions = JSON.parse(response);
        return Array.isArray(suggestions) ? suggestions : [response];
      } catch (parseError) {
        // If parsing fails, return the raw response split by lines
        return response.split('\n').filter(line => line.trim().length > 0);
      }

    } catch (error) {
      console.error('Error generating integration suggestions:', error);
      return ['Review content manually for integration opportunities'];
    }
  }
};