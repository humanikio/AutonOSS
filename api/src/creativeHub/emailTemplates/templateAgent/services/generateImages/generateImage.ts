/**
 * Generate Image Module
 * Calls the LLM provider (nanoBanana) to generate images
 */

import nanoBanana from '../../../../../llmModels/nanoBanana';

export interface GenerateImageInput {
  prompt: string;
  aspectRatio?: string;
  quality?: 'standard' | 'high';
}

export interface GenerateImageOutput {
  success: boolean;
  imageBuffer?: Buffer;
  error?: string;
}

/**
 * Generate an image using nanoBanana
 *
 * @param input - Prompt and generation options
 * @returns Image buffer or error
 */
export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  const { prompt, aspectRatio = '16:9', quality = 'high' } = input;

  console.log('[Generate Image] Calling nanoBanana...');
  console.log('[Generate Image] Prompt length:', prompt.length, 'characters');
  console.log('[Generate Image] Aspect ratio:', aspectRatio);
  console.log('[Generate Image] Quality:', quality);

  try {
    const result = await nanoBanana.generateImage({
      prompt,
      aspectRatio,
      quality
    });

    if (!result.success || !result.imageBuffer) {
      console.error('[Generate Image] L Generation failed:', result.error);
      return {
        success: false,
        error: result.error || 'Image generation failed'
      };
    }

    console.log('[Generate Image]  Image generated successfully');

    return {
      success: true,
      imageBuffer: result.imageBuffer
    };
  } catch (error) {
    console.error('[Generate Image] L Error calling nanoBanana:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
