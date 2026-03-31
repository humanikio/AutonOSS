/**
 * Generate HTML Code using Claude LLM
 *
 * Calls Claude with the compiled prompt and existing images
 * Returns the generated HTML and assistant message
 */

import { claude4 } from '../../../../../llmModels/claude4';
import { HtmlGenerationJsonValidator } from './utils/validateJson';
import { TemplateImage } from '../../tools/fetchCurrentTemplateImages';

export interface GenerateCodeInput {
  fullPrompt: string;
  existingImages: TemplateImage[];
}

export interface GenerateCodeOutput {
  assistantMessage: string;
  html: string;
  rawResponse: string;
  repaired?: boolean;
}

/**
 * Generate HTML code by calling Claude 4
 *
 * @param input - Full prompt and existing images
 * @returns Generated HTML code and assistant message
 */
export async function generateCode(input: GenerateCodeInput): Promise<GenerateCodeOutput> {
  const { fullPrompt, existingImages } = input;

  console.log('[HTML Generate Code] Calling Claude 4 LLM...');
  console.log(`[HTML Generate Code] Prompt length: ${fullPrompt.length} characters`);
  console.log(`[HTML Generate Code] Existing images: ${existingImages.length}`);

  try {
    // Call Claude 4 - with images if they exist, otherwise just text
    let rawResponse: string;

    if (existingImages.length > 0) {
      console.log('[HTML Generate Code] Sending with image context...');

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
      console.log('[HTML Generate Code] Sending text-only...');
      rawResponse = await claude4.processText(fullPrompt);
    }

    console.log('[HTML Generate Code]  Received response from Claude 4');
    console.log(`[HTML Generate Code] Response length: ${rawResponse.length} characters`);

    // Parse the JSON response using robust validator
    const validationResult = HtmlGenerationJsonValidator.validateAndParse(
      rawResponse,
      'HTML Generation'
    );

    if (!validationResult.success) {
      console.error('[HTML Generate Code] L JSON validation failed:', validationResult.error);
      console.error('[HTML Generate Code] Raw response:', rawResponse);

      // Create fallback data
      const fallbackData = HtmlGenerationJsonValidator.createFallbackData(
        validationResult.error || 'Unknown validation error'
      );

      return {
        assistantMessage: fallbackData.assistantMessage,
        html: fallbackData.html,
        rawResponse,
        repaired: false
      };
    }

    const parsedResponse = validationResult.data;

    if (validationResult.repaired) {
      console.log('[HTML Generate Code]   Response was repaired during parsing');
    }

    // Validate schema
    const schemaValidation = HtmlGenerationJsonValidator.validateHtmlGeneration(parsedResponse);

    if (!schemaValidation.success) {
      console.error('[HTML Generate Code] L Schema validation failed:', schemaValidation.error);

      // Create fallback data
      const fallbackData = HtmlGenerationJsonValidator.createFallbackData(
        schemaValidation.error || 'Schema validation failed'
      );

      return {
        assistantMessage: fallbackData.assistantMessage,
        html: fallbackData.html,
        rawResponse,
        repaired: false
      };
    }

    console.log('[HTML Generate Code]  Response validated successfully');
    console.log(
      `[HTML Generate Code] Assistant message: "${parsedResponse.assistantMessage.substring(0, 80)}..."`
    );
    console.log(`[HTML Generate Code] HTML length: ${parsedResponse.html.length} characters`);

    return {
      assistantMessage: parsedResponse.assistantMessage,
      html: parsedResponse.html,
      rawResponse,
      repaired: validationResult.repaired
    };
  } catch (error) {
    console.error('[HTML Generate Code] L Error generating HTML code:', error);

    // Create fallback data
    const fallbackData = HtmlGenerationJsonValidator.createFallbackData(
      error instanceof Error ? error.message : 'Unknown error'
    );

    return {
      assistantMessage: fallbackData.assistantMessage,
      html: fallbackData.html,
      rawResponse: '',
      repaired: false
    };
  }
}
