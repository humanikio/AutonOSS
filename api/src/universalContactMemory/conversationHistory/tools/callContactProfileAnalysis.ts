import { analyzeContactDataService } from '../../contactProfile/services/analyzeContactData';
import { Message } from '../services/getConversationHistory/pullLatestMessages';

/**
 * Tool for automatically updating contact profiles after conversation summarization
 * Compiles summary + latest messages and triggers AI-powered profile analysis
 */

export interface CallContactProfileAnalysisRequest {
  tenantId: string;
  contactId: string;
  conversationSummary: string;
  recentMessages: Message[];
}

export interface CallContactProfileAnalysisResult {
  success: boolean;
  updatePerformed?: boolean;
  profileId?: string;
  error?: string;
}

/**
 * Compile conversation data into formatted string for profile analysis
 */
function compileConversationData(summary: string, messages: Message[]): string {
  let compiledData = '';

  // Add summary section
  if (summary && summary.length > 0) {
    compiledData += '=== CONVERSATION SUMMARY ===\n';
    compiledData += summary;
    compiledData += '\n\n';
  }

  // Add recent messages section
  if (messages.length > 0) {
    compiledData += '=== RECENT MESSAGES ===\n';

    messages.forEach((msg, index) => {
      const timestamp = msg.created_at.toDate().toLocaleString();
      const direction = msg.direction === 'inbound' ? 'Customer' : 'Agent';

      compiledData += `[${timestamp}] ${direction}: ${msg.body}\n`;

      // Add spacing between messages for readability
      if (index < messages.length - 1) {
        compiledData += '\n';
      }
    });
  }

  return compiledData;
}

/**
 * Call contact profile analysis with conversation data
 * This is a fire-and-forget background operation
 */
export async function callContactProfileAnalysis(
  request: CallContactProfileAnalysisRequest
): Promise<CallContactProfileAnalysisResult> {
  try {
    const { tenantId, contactId, conversationSummary, recentMessages } = request;

    console.log('=Þ Calling contact profile analysis');
    console.log(`  - Tenant ID: ${tenantId}`);
    console.log(`  - Contact ID: ${contactId}`);
    console.log(`  - Summary length: ${conversationSummary.length} chars`);
    console.log(`  - Recent messages: ${recentMessages.length}`);

    // Compile conversation data into string format
    const compiledData = compileConversationData(conversationSummary, recentMessages);

    console.log(`  - Compiled data length: ${compiledData.length} chars`);

    // Call the analyze contact data service
    const result = await analyzeContactDataService.analyzeAndUpdate({
      tenantId,
      contactId,
      newData: compiledData
    });

    if (!result.success) {
      console.error('L Contact profile analysis failed:', result.error);
      return {
        success: false,
        error: result.error
      };
    }

    console.log(` Contact profile analysis completed`);
    console.log(`  - Update performed: ${result.updatePerformed}`);
    console.log(`  - Profile ID: ${result.profileId}`);

    return {
      success: true,
      updatePerformed: result.updatePerformed,
      profileId: result.profileId
    };

  } catch (error) {
    console.error('L Error calling contact profile analysis:', error);

    return {
      success: false,
      error: `Failed to call contact profile analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Background wrapper for fire-and-forget profile analysis
 * Use this to trigger analysis without blocking the main flow
 */
export function triggerContactProfileAnalysisBackground(
  request: CallContactProfileAnalysisRequest
): void {
  // Fire and forget - don't await
  callContactProfileAnalysis(request)
    .then(result => {
      if (result.success) {
        console.log('<‰ Background contact profile analysis completed successfully');
      } else {
        console.error('  Background contact profile analysis failed (non-blocking):', result.error);
      }
    })
    .catch(error => {
      console.error('  Background contact profile analysis error (non-blocking):', error);
    });
}
