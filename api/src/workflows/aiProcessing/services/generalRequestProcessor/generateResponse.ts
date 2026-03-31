import { claude4 } from '../../../../llmModels/claude4';

/**
 * Generates a response from Claude AI
 *
 * @param prompt - User's prompt
 * @param systemPrompt - Optional system instructions
 * @returns Claude's response text
 */
export const generateResponse = async (
  prompt: string,
  systemPrompt?: string
): Promise<string> => {
  try {
    console.log(`> Generating Claude response...`);
    console.log(`   Prompt length: ${prompt.length} chars`);
    if (systemPrompt) {
      console.log(`   System prompt length: ${systemPrompt.length} chars`);
    }

    const startTime = Date.now();

    let response: string;

    if (systemPrompt) {
      // Use system prompt version
      response = await claude4.processTextWithSystemPrompt(systemPrompt, prompt);
    } else {
      // Use simple version
      response = await claude4.processText(prompt);
    }

    const duration = Date.now() - startTime;
    console.log(` Claude response generated in ${duration}ms`);
    console.log(`   Response length: ${response.length} chars`);

    return response;
  } catch (error: any) {
    console.error('L Error generating Claude response:', error);
    throw new Error(`Failed to generate Claude response: ${error.message}`);
  }
};
