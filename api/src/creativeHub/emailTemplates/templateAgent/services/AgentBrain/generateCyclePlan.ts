import { claude4 } from '../../../../../llmModels/claude4';
import { JsonValidator } from '../../../../../agentCommunication/sms/utilities/jsonValidator';
import { TemplateImage } from '../../tools/fetchCurrentTemplateImages';

export interface GenerateCyclePlanInput {
  fullPrompt: string;
  existingImages: TemplateImage[];
}

export interface GenerateCyclePlanOutput {
  rawResponse: string;
  parsedResponse: {
    initialResponse: string;
    tools: Array<{
      tool: 'generateImage' | 'generateHtml' | 'clarification';
      parameters: Record<string, any>;
    }>;
  };
  repaired?: boolean;
}

/**
 * Generate a cycle plan by calling Claude 4 with the compiled prompt
 *
 * This function:
 * 1. Takes the full compiled prompt
 * 2. Sends it to Claude 4 LLM
 * 3. Receives JSON response
 * 4. Parses and validates the response structure using JsonValidator
 * 5. Returns both raw and parsed responses
 *
 * @param input - Object containing the full compiled prompt
 * @returns Object containing raw LLM response and parsed JSON
 */
export async function generateCyclePlan(
  input: GenerateCyclePlanInput
): Promise<GenerateCyclePlanOutput> {
  const { fullPrompt, existingImages } = input;

  try {
    console.log('[Generate Cycle Plan] Calling Claude 4 LLM...');
    console.log(`[Generate Cycle Plan] Prompt length: ${fullPrompt.length} characters`);
    console.log(`[Generate Cycle Plan] Existing images: ${existingImages.length}`);

    // Call Claude 4 - with images if they exist, otherwise just text
    let rawResponse: string;

    if (existingImages.length > 0) {
      console.log('[Generate Cycle Plan] Sending with image context...');

      // Build image array with captions
      const images = existingImages.map((img, idx) => ({
        base64: img.base64,
        mimeType: img.mimeType,
        caption: `Image ${idx + 1}: ${img.purpose || 'email image'} (${img.dimensions || 'unknown dimensions'})`
      }));

      rawResponse = await claude4.processWithImages({
        images,
        textPrompt: fullPrompt
      });
    } else {
      console.log('[Generate Cycle Plan] Sending text-only...');
      rawResponse = await claude4.processText(fullPrompt);
    }

    console.log('[Generate Cycle Plan] Received response from Claude 4');
    console.log(`[Generate Cycle Plan] Response length: ${rawResponse.length} characters`);

    // Parse the JSON response using robust JsonValidator
    const validationResult = JsonValidator.validateAndParse(
      rawResponse,
      'Template Agent Cycle Plan'
    );

    if (!validationResult.success) {
      console.error('[Generate Cycle Plan] JSON validation failed:', validationResult.error);
      console.error('[Generate Cycle Plan] Raw response:', rawResponse);
      throw new Error(validationResult.error || 'LLM response is not valid JSON');
    }

    const parsedResponse = validationResult.data;

    if (validationResult.repaired) {
      console.log('[Generate Cycle Plan] ⚠️ Response was repaired during parsing');
    }

    // Validate response structure
    if (!parsedResponse.initialResponse || typeof parsedResponse.initialResponse !== 'string') {
      throw new Error('LLM response missing required field: initialResponse');
    }

    if (!Array.isArray(parsedResponse.tools)) {
      throw new Error('LLM response missing required field: tools (must be array)');
    }

    // Validate each tool in the array
    for (let i = 0; i < parsedResponse.tools.length; i++) {
      const tool = parsedResponse.tools[i];

      if (!tool.tool || !['generateImage', 'generateHtml', 'clarification'].includes(tool.tool)) {
        throw new Error(`Invalid tool at index ${i}: ${tool.tool}`);
      }

      if (!tool.parameters || typeof tool.parameters !== 'object') {
        throw new Error(`Tool at index ${i} missing parameters object`);
      }
    }

    console.log('[Generate Cycle Plan] Response validated successfully');
    console.log(`[Generate Cycle Plan] Initial response: "${parsedResponse.initialResponse.substring(0, 80)}..."`);
    console.log(`[Generate Cycle Plan] Number of tools: ${parsedResponse.tools.length}`);

    return {
      rawResponse,
      parsedResponse,
      repaired: validationResult.repaired
    };
  } catch (error) {
    console.error('[Generate Cycle Plan] Error generating cycle plan:', error);
    throw error;
  }
}
