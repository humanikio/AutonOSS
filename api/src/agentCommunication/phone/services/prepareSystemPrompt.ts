import { analyzePromptVariables } from './prepareSystemPrompt/analyzePromptVariables';
import { resolveCustomVariables } from './prepareSystemPrompt/resolveCustomVariables';
import { injectCustomVariables } from './prepareSystemPrompt/injectCustomVariables';
import { injectContactOverview, type CallDirection } from './prepareSystemPrompt/injectContactOverview';

/**
 * System Prompt Preparation for Agent Phone Calls
 *
 * This service prepares agent system prompts by:
 * 1. Resolving custom field expressions ({{$contact.firstName}}, etc.)
 * 2. Injecting contact overview (conversation history + AI-learned profile)
 * 3. Adding soft constraint guidance on natural context usage
 *
 * Used by: Phone call initiation before sending to 11Labs
 */

export interface PrepareSystemPromptRequest {
  tenantId: string;
  contactId: string;
  systemPrompt: string;       // Raw prompt with possible {{$contact.X}} expressions
  conversationId?: string;     // For fetching conversation history
  sessionId?: string;          // For training mode
  isTraining?: boolean;        // Training vs production mode
  callDirection?: CallDirection; // Direction of the call (inbound vs outbound)
}

export interface PrepareSystemPromptResponse {
  preparedPrompt: string;                  // Fully resolved and injected
  customFieldsFound: string[];             // Variables detected
  customFieldsResolved: Record<string, any>; // Successfully resolved values
  customFieldsNotFound: string[];          // Variables that couldn't be resolved
  contactOverviewInjected: boolean;        // Whether context was added
}

class PrepareSystemPrompt {
  /**
   * Main orchestrator for system prompt preparation
   * Handles both custom field resolution and contact context injection
   */
  async prepare(request: PrepareSystemPromptRequest): Promise<PrepareSystemPromptResponse> {
    try {
      console.log(`📞 Starting system prompt preparation for contact ${request.contactId}`);
      console.log(`   Mode: ${request.isTraining ? 'Training' : 'Production'}`);

      // STEP 1: Analyze system prompt for custom field expressions
      console.log('\n📋 Step 1: Analyzing system prompt for custom variables...');
      const analysisResult = analyzePromptVariables.analyze({
        content: request.systemPrompt
      });

      console.log(`   Found ${analysisResult.variables.length} custom variable(s)`);
      if (analysisResult.variables.length > 0) {
        console.log(`   Variables: ${analysisResult.variables.join(', ')}`);
      }

      let processedPrompt = request.systemPrompt;
      let resolvedVariables: Record<string, any> = {};
      let notFoundVariables: string[] = [];

      // STEP 2: Resolve custom fields (if any found)
      if (analysisResult.variables.length > 0) {
        console.log('\n🔍 Step 2: Resolving custom variables from contact data...');

        const resolutionResult = await resolveCustomVariables.resolve({
          tenantId: request.tenantId,
          contactId: request.contactId,
          variableNames: analysisResult.variables
        });

        resolvedVariables = resolutionResult.resolved;
        notFoundVariables = resolutionResult.notFound;

        const successCount = Object.keys(resolvedVariables).length - notFoundVariables.length;
        console.log(`   Resolved ${successCount}/${analysisResult.variables.length} variable(s)`);

        // STEP 3: Inject resolved values into prompt
        console.log('\n💉 Step 3: Injecting custom variable values...');
        const injectionResult = injectCustomVariables.inject({
          content: request.systemPrompt,
          resolvedVariables: resolutionResult.resolved
        });

        processedPrompt = injectionResult.injectedContent;
        console.log('   ✅ Custom variables injected');
      } else {
        console.log('\n⏭️  Steps 2-3: Skipped (no custom variables found)');
      }

      // STEP 4: Inject contact overview (conversation history + profile)
      console.log('\n🎯 Step 4: Injecting contact overview and conversation context...');
      const overviewInjectionResult = await injectContactOverview.inject({
        tenantId: request.tenantId,
        contactId: request.contactId,
        systemPrompt: processedPrompt,
        conversationId: request.conversationId,
        sessionId: request.sessionId,
        isTraining: request.isTraining,
        callDirection: request.callDirection
      });

      const finalPrompt = overviewInjectionResult.injectedPrompt;

      console.log(`   Contact overview: ${overviewInjectionResult.overviewInjected ? '✅ Injected' : '⚠️ Not available'}`);
      console.log(`   Profile included: ${overviewInjectionResult.profileIncluded ? 'Yes' : 'No'}`);
      console.log(`   History messages: ${overviewInjectionResult.historyMessageCount || 0}`);

      console.log(`\n✅ System prompt preparation complete`);
      console.log(`   Original length: ${request.systemPrompt.length} chars`);
      console.log(`   Final length: ${finalPrompt.length} chars`);
      console.log(`   Added context: ${finalPrompt.length - request.systemPrompt.length} chars\n`);

      return {
        preparedPrompt: finalPrompt,
        customFieldsFound: analysisResult.variables,
        customFieldsResolved: resolvedVariables,
        customFieldsNotFound: notFoundVariables,
        contactOverviewInjected: overviewInjectionResult.overviewInjected
      };

    } catch (error) {
      console.error('❌ Error preparing system prompt:', error);

      // Return original prompt as fallback to avoid breaking calls
      return {
        preparedPrompt: request.systemPrompt,
        customFieldsFound: [],
        customFieldsResolved: {},
        customFieldsNotFound: [],
        contactOverviewInjected: false
      };
    }
  }
}

export const prepareSystemPrompt = new PrepareSystemPrompt();
