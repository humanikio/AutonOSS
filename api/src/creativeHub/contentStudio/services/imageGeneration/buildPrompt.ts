/**
 * Prompt compilation module
 * Builds the final prompt using gathered data and prompt engineering best practices
 */

import { GatheredData } from './gatherData';
import {
  buildBasePrompt,
  qualityModifiers,
  lightingPresets,
  styleEnhancements,
  enhanceUserPrompt
} from './promptEngineering';

export interface CompiledPrompt {
  final: string;
  original: string;
  enhancements: string[];
  complimentaryColor?: string;
}

/**
 * Build and compile the final prompt for image generation
 * Incorporates best practices and enhancements
 */
export async function buildPrompt(data: GatheredData): Promise<CompiledPrompt> {
  const enhancements: string[] = [];
  let finalPrompt = data.prompt.trim();
  let complimentaryColor: string | undefined;

  // Step 1: Enhance the user prompt with AI
  console.log(`🤖 Enhancing user prompt with AI...`);
  const enhancementResult = await enhanceUserPrompt(data.prompt);

  if (enhancementResult.success) {
    finalPrompt = enhancementResult.revisedPrompt;
    complimentaryColor = enhancementResult.complimentaryColor;
    enhancements.push('ai_enhanced');
    console.log(`✅ Prompt enhanced by AI`);
  } else {
    console.log(`⚠️ AI enhancement failed, using original prompt:`, enhancementResult.error);
  }

  // Apply quality enhancements
  if (data.quality) {
    const qualityText = qualityModifiers[data.quality];
    if (qualityText) {
      enhancements.push('quality');
      finalPrompt += `. ${qualityText}`;
    }
  }

  // Apply style enhancements if specified
  if (data.style && data.style in styleEnhancements) {
    const styleText = styleEnhancements[data.style as keyof typeof styleEnhancements];
    if (styleText) {
      enhancements.push('style');
      finalPrompt += `. ${styleText}`;
    }
  }

  // Apply aspect ratio specifications
  if (data.aspectRatio) {
    enhancements.push('aspect_ratio');
    finalPrompt += `. Optimized for ${data.aspectRatio} aspect ratio`;

    // Add specific guidance based on aspect ratio
    switch (data.aspectRatio) {
      case '1:1':
        finalPrompt += ', square format ideal for social media posts';
        break;
      case '16:9':
        finalPrompt += ', widescreen format ideal for desktop displays and presentations';
        break;
      case '9:16':
        finalPrompt += ', vertical format optimized for mobile viewing and stories';
        break;
      case '4:3':
        finalPrompt += ', standard format balanced for various uses';
        break;
      case '3:4':
        finalPrompt += ', portrait format suitable for posters and prints';
        break;
      case '21:9':
        finalPrompt += ', ultra-wide format for immersive desktop experiences';
        break;
      case '3:2':
        finalPrompt += ', photo format ideal for traditional photography';
        break;
      case '2:3':
        finalPrompt += ', portrait photo format';
        break;
    }
  }

  // Add general best practices if not already very detailed
  if (data.prompt.length < 100) {
    enhancements.push('composition');
    finalPrompt += '. Professional composition with clear focal point and balanced elements';
  }

  // Add reference image context if provided
  if (data.hasReferenceImage) {
    enhancements.push('reference_image');
    finalPrompt = `Using the provided reference image as guidance: ${finalPrompt}. Maintain key visual elements while enhancing quality and details`;
  }

  return {
    final: finalPrompt,
    original: data.prompt,
    enhancements,
    complimentaryColor
  };
}

/**
 * Validate the compiled prompt
 */
export function validateCompiledPrompt(compiledPrompt: CompiledPrompt): boolean {
  if (!compiledPrompt.final || compiledPrompt.final.trim().length === 0) {
    throw new Error('Compiled prompt is empty');
  }

  if (compiledPrompt.final.length > 4000) {
    throw new Error('Compiled prompt exceeds maximum length of 4000 characters');
  }

  return true;
}
