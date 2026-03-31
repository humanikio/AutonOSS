/**
 * Data gathering module for image generation
 * Organizes and validates input data (prompt, reference images, etc.)
 */

export interface ImageGenerationInput {
  prompt?: string;
  referenceImage?: Buffer;
  style?: string;
  aspectRatio?: string;
  quality?: 'standard' | 'high';
}

export interface GatheredData {
  prompt: string;
  referenceImage?: Buffer;
  style?: string;
  aspectRatio?: string;
  quality?: 'standard' | 'high';
  hasPrompt: boolean;
  hasReferenceImage: boolean;
}

/**
 * Gathers and validates data for image generation
 * Fails if neither prompt nor reference image is provided
 */
export async function gatherData(input: ImageGenerationInput): Promise<GatheredData> {
  const { prompt, referenceImage, style, aspectRatio, quality } = input;

  // Validate that we have at least prompt or reference image
  if (!prompt && !referenceImage) {
    throw new Error('Either prompt or reference image must be provided for image generation');
  }

  // Organize the data
  const gatheredData: GatheredData = {
    prompt: prompt || '',
    referenceImage,
    style,
    aspectRatio,
    quality: quality || 'high',
    hasPrompt: !!prompt,
    hasReferenceImage: !!referenceImage
  };

  // Validate prompt if provided
  if (gatheredData.hasPrompt && gatheredData.prompt.trim().length < 3) {
    throw new Error('Prompt must be at least 3 characters long');
  }

  // Validate reference image if provided
  if (gatheredData.hasReferenceImage && !referenceImage) {
    throw new Error('Reference image buffer is invalid');
  }

  return gatheredData;
}

/**
 * Prepare data for different generation modes
 */
export function getGenerationMode(data: GatheredData): 'text-to-image' | 'image-to-image' | 'combined' {
  if (data.hasPrompt && data.hasReferenceImage) {
    return 'combined';
  } else if (data.hasReferenceImage) {
    return 'image-to-image';
  } else {
    return 'text-to-image';
  }
}
