import { analyzeContent } from './reviewRequestData/analyzeContent';
import { resolveCustomVariables } from './reviewRequestData/resolveCustomVariables';
import { injectVariables } from './reviewRequestData/injectVariables';

export interface ReviewRequestDataRequest {
  tenantId: string;
  contactId: string;
  content: string;  // Raw prompt/content with variables
}

export interface ReviewRequestDataResponse {
  preparedContent: string;              // Injected content ready for AI processing
  variablesFound: string[];             // All variables found in template
  variablesResolved: Record<string, any>; // Variables successfully resolved
  variablesNotFound: string[];          // Variables that couldn't be resolved
}

class ReviewRequestData {
  /**
   * Main orchestrator for request data preparation
   * 1. Analyzes content and extracts variables
   * 2. Resolves variables from contact data
   * 3. Injects resolved values into template
   */
  async review(request: ReviewRequestDataRequest): Promise<ReviewRequestDataResponse> {
    try {
      console.log(`<= Starting request data review for contact ${request.contactId}`);

      // Step 1: Analyze content and extract variables
      const analysisResult = analyzeContent.analyze({
        content: request.content
      });

      console.log(`==Ë Analysis complete: ${analysisResult.variables.length} variable(s) found`);

      // Step 2: Resolve variables from contact data
      const resolutionResult = await resolveCustomVariables.resolve({
        tenantId: request.tenantId,
        contactId: request.contactId,
        variableNames: analysisResult.variables
      });

      console.log(`= Resolution complete: ${Object.keys(resolutionResult.resolved).length - resolutionResult.notFound.length}/${analysisResult.variables.length} resolved`);

      // Step 3: Inject resolved values into template
      const injectionResult = injectVariables.inject({
        content: request.content,
        resolvedVariables: resolutionResult.resolved
      });

      console.log(`> Request data review complete`);

      return {
        preparedContent: injectionResult.injectedContent,
        variablesFound: analysisResult.variables,
        variablesResolved: resolutionResult.resolved,
        variablesNotFound: resolutionResult.notFound
      };

    } catch (error) {
      console.error('L Error reviewing request data:', error);
      throw new Error(`Failed to review request data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const reviewRequestData = new ReviewRequestData();
