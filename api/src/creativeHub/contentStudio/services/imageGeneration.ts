/**
 * Image Generation Orchestrator
 * Main entry point for image generation flow
 * Coordinates: data gathering � prompt building � image generation � storage
 */

import { gatherData, ImageGenerationInput } from './imageGeneration/gatherData';
import { buildPrompt, validateCompiledPrompt } from './imageGeneration/buildPrompt';
import { genImage, GeneratedAsset } from './imageGeneration/genImage';

/**
 * Main orchestrator function for generating image assets
 *
 * Flow:
 * 1. Gather and validate input data (prompt, reference images, etc.)
 * 2. Build and compile the final prompt with enhancements
 * 3. Generate image using provider (default: nanoBanana)
 * 4. Upload to Firebase Storage
 * 5. Create Firestore document
 * 6. Return asset information
 */
export async function generateImageAsset(
  tenantId: string,
  sessionId: string,
  input: ImageGenerationInput,
  providerId?: string
): Promise<GeneratedAsset> {
  try {
    console.log(`=� Starting image generation for session ${sessionId}`);

    // Step 1: Gather and validate data
    console.log(`=� Step 1: Gathering data...`);
    const gatheredData = await gatherData(input);
    console.log(` Data gathered successfully (mode: ${gatheredData.hasReferenceImage ? 'with reference' : 'text-only'})`);

    // Step 2: Build and compile prompt
    console.log(`=( Step 2: Building prompt...`);
    const compiledPrompt = await buildPrompt(gatheredData);
    validateCompiledPrompt(compiledPrompt);
    console.log(` Prompt compiled (${compiledPrompt.enhancements.length} enhancements applied)`);
    console.log(`=� Final prompt: ${compiledPrompt.final.substring(0, 100)}...`);

    // Step 3: Generate image and store
    console.log(`<� Step 3: Generating and storing image...`);
    const asset = await genImage(
      tenantId,
      sessionId,
      compiledPrompt,
      gatheredData,
      providerId
    );
    console.log(` Image generation complete!`);
    console.log(`= Asset URL: ${asset.url}`);

    return asset;
  } catch (error) {
    console.error('L Image generation orchestrator error:', error);
    throw error;
  }
}

// Export types for external use
export type { GeneratedAsset, ImageGenerationInput };
