import { claude4 } from '../../../../llmModels/claude4';

/**
 * Review provided data and determine if contact profile update is needed
 * Uses Claude 4 to analyze new data against existing profile
 */

export interface ReviewProvidedDataRequest {
  currentProfileText: string;
  newData: string;
}

export interface ReviewProvidedDataResult {
  success: boolean;
  updateNeeded: boolean;
  updatedContactProfile?: string;
  error?: string;
}

const SYSTEM_PROMPT = `You are a contact profile analyzer. Your job is to review new information about a contact and determine if their profile should be updated.

IMPORTANT PROFILE GUIDELINES:
- Include information that helps understand WHO this person is
- Include information about WHAT they want or need
- Include previous interaction notes and context
- Include fun facts, personal details, preferences
- Include business information, role, company details
- Include communication preferences and patterns
- Include any goals, challenges, or pain points mentioned
- Include relationship context and history

ANALYSIS APPROACH:
1. Compare the new data with the existing profile
2. Identify new, important information that should be added
3. Look for contradictions or updates to existing information
4. Focus on details that provide meaningful context for future interactions

OUTPUT REQUIREMENTS:
You must respond with ONLY valid JSON in this exact format:
{
  "updateNeeded": boolean,
  "updatedContactProfile": "string (only if updateNeeded is true)"
}

If updateNeeded is true:
- Merge the new information with the existing profile
- Create a comprehensive, well-organized profile
- Use clear, concise language
- Organize information logically (personal info, business context, preferences, history, etc.)
- Remove redundant information
- Keep the most recent/accurate information

If updateNeeded is false:
- The new data doesn't add meaningful information
- Or the new data is already captured in the existing profile`;

export async function reviewProvidedData(
  request: ReviewProvidedDataRequest
): Promise<ReviewProvidedDataResult> {
  try {
    const { currentProfileText, newData } = request;

    console.log('üîç Reviewing provided data with Claude 4');
    console.log(`  - Current profile length: ${currentProfileText.length} chars`);
    console.log(`  - New data length: ${newData.length} chars`);

    // Build user prompt
    const userPrompt = `EXISTING CONTACT PROFILE:
${currentProfileText || '[No existing profile]'}

NEW DATA TO ANALYZE:
${newData}

Analyze the new data and determine if the contact profile should be updated. Respond with JSON only.`;

    console.log('=‰ Sending request to Claude 4...');

    // Call Claude 4
    const response = await claude4.processTextWithSystemPrompt(
      SYSTEM_PROMPT,
      userPrompt
    );

    console.log('=Â Received response from Claude 4');
    console.log(`  - Response length: ${response.length} chars`);

    // Parse JSON response
    let parsedResponse: {
      updateNeeded: boolean;
      updatedContactProfile?: string;
    };

    try {
      // Try to extract JSON from response (in case Claude adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      parsedResponse = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('L Failed to parse Claude response as JSON:', parseError);
      console.error('Raw response:', response);
      return {
        success: false,
        updateNeeded: false,
        error: 'Failed to parse AI response'
      };
    }

    // Validate response structure
    if (typeof parsedResponse.updateNeeded !== 'boolean') {
      console.error('L Invalid response structure - missing updateNeeded boolean');
      return {
        success: false,
        updateNeeded: false,
        error: 'Invalid AI response structure'
      };
    }

    if (parsedResponse.updateNeeded && !parsedResponse.updatedContactProfile) {
      console.error('L Invalid response - updateNeeded is true but no updatedContactProfile provided');
      return {
        success: false,
        updateNeeded: false,
        error: 'Invalid AI response - missing updated profile'
      };
    }

    console.log(` Analysis complete - Update needed: ${parsedResponse.updateNeeded}`);
    if (parsedResponse.updateNeeded && parsedResponse.updatedContactProfile) {
      console.log(`  - Updated profile length: ${parsedResponse.updatedContactProfile.length} chars`);
    }

    return {
      success: true,
      updateNeeded: parsedResponse.updateNeeded,
      updatedContactProfile: parsedResponse.updatedContactProfile
    };

  } catch (error) {
    console.error('L Error reviewing provided data:', error);
    return {
      success: false,
      updateNeeded: false,
      error: `Failed to review data: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
