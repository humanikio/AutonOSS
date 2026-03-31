import { analyzeEmailContent } from './prepareEmailContent/analyzeEmailContent';
import { resolveCustomVariables } from './prepareEmailContent/resolveCustomVariables';
import { injectVariables } from './prepareEmailContent/injectVariables';

export interface PrepareEmailContentRequest {
  tenantId: string;
  contactId: string;
  content: string;      // Raw template (text or HTML)
  isHtml: boolean;      // Content format indicator
}

export interface PrepareEmailContentResponse {
  preparedContent: string;              // Injected template ready for sending
  isHtml: boolean;
  variablesFound: string[];             // All variables found in template
  variablesResolved: Record<string, any>; // Variables successfully resolved
  variablesNotFound: string[];          // Variables that couldn't be resolved
}

class PrepareEmailContent {
  /**
   * Main orchestrator for email content preparation
   * 1. Analyzes content and extracts variables
   * 2. Resolves variables from contact data
   * 3. Injects resolved values into template
   */
  async prepare(request: PrepareEmailContentRequest): Promise<PrepareEmailContentResponse> {
    try {
      console.log(`<¯ Starting email content preparation for contact ${request.contactId}`);

      // Step 1: Analyze content and extract variables
      const analysisResult = analyzeEmailContent.analyze({
        content: request.content,
        isHtml: request.isHtml
      });

      console.log(`=Ë Analysis complete: ${analysisResult.variables.length} variable(s) found`);

      // Step 2: Resolve variables from contact data
      const resolutionResult = await resolveCustomVariables.resolve({
        tenantId: request.tenantId,
        contactId: request.contactId,
        variableNames: analysisResult.variables
      });

      console.log(`=Ë Resolution complete: ${Object.keys(resolutionResult.resolved).length - resolutionResult.notFound.length}/${analysisResult.variables.length} resolved`);

      // Step 3: Inject resolved values into template
      const injectionResult = injectVariables.inject({
        content: request.content,
        isHtml: request.isHtml,
        resolvedVariables: resolutionResult.resolved
      });

      console.log(` Email content preparation complete`);

      return {
        preparedContent: injectionResult.injectedContent,
        isHtml: request.isHtml,
        variablesFound: analysisResult.variables,
        variablesResolved: resolutionResult.resolved,
        variablesNotFound: resolutionResult.notFound
      };

    } catch (error) {
      console.error('L Error preparing email content:', error);
      throw new Error(`Failed to prepare email content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const prepareEmailContent = new PrepareEmailContent();
