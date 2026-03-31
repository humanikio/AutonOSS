import { analyzeSmsContent } from './prepareSmsContent/analyzeSmsContent';
import { resolveCustomVariables } from './prepareSmsContent/resolveCustomVariables';
import { injectVariables } from './prepareSmsContent/injectVariables';

export interface PrepareSmsContentRequest {
  tenantId: string;
  contactId: string;
  content: string;  // Raw SMS template/message
}

export interface PrepareSmsContentResponse {
  preparedContent: string;              // Injected message ready for sending
  variablesFound: string[];             // All variables found in template
  variablesResolved: Record<string, any>; // Variables successfully resolved
  variablesNotFound: string[];          // Variables that couldn't be resolved
}

class PrepareSmsContent {
  /**
   * Main orchestrator for SMS content preparation
   * 1. Analyzes content and extracts variables
   * 2. Resolves variables from contact data
   * 3. Injects resolved values into template
   */
  async prepare(request: PrepareSmsContentRequest): Promise<PrepareSmsContentResponse> {
    try {
      console.log(`<📱 Starting SMS content preparation for contact ${request.contactId}`);

      // Step 1: Analyze content and extract variables
      const analysisResult = analyzeSmsContent.analyze({
        content: request.content
      });

      console.log(`=📋 Analysis complete: ${analysisResult.variables.length} variable(s) found`);

      // Step 2: Resolve variables from contact data
      const resolutionResult = await resolveCustomVariables.resolve({
        tenantId: request.tenantId,
        contactId: request.contactId,
        variableNames: analysisResult.variables
      });

      console.log(`=✅ Resolution complete: ${Object.keys(resolutionResult.resolved).length - resolutionResult.notFound.length}/${analysisResult.variables.length} resolved`);

      // Step 3: Inject resolved values into template
      const injectionResult = injectVariables.inject({
        content: request.content,
        resolvedVariables: resolutionResult.resolved
      });

      console.log(`>✅ SMS content preparation complete`);

      return {
        preparedContent: injectionResult.injectedContent,
        variablesFound: analysisResult.variables,
        variablesResolved: resolutionResult.resolved,
        variablesNotFound: resolutionResult.notFound
      };

    } catch (error) {
      console.error('❌ Error preparing SMS content:', error);
      throw new Error(`Failed to prepare SMS content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const prepareSmsContent = new PrepareSmsContent();
