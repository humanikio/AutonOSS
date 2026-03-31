/**
 * Image Generation Service for Email Templates
 * Orchestrates the image generation workflow
 */

import { buildImagePrompt } from './generateImages/buildPrompt';
import { generateImage } from './generateImages/generateImage';
import { saveImage2Firebase } from './generateImages/saveImage2Firebase';
import { readTask, updateTask } from './taskManager';

export interface GenerateImagesInput {
  tenantId: string;
  templateId: string;
  cycleId: string;
  taskId: string;
}

export interface GenerateImagesOutput {
  success: boolean;
  imagesGenerated: number;
  imageIds: string[];
  imageUrls: string[];
  taskId: string;
  result?: any; // Result data for orchestrator to store
}

/**
 * Image Generation Service
 *
 * Pure worker that generates and saves images.
 * Returns result to orchestrator for state management.
 *
 * Flow:
 * 1. Read task to get parameters
 * 2. Build comprehensive prompt with context (buildPrompt)
 * 3. Generate image via LLM provider (generateImage)
 * 4. Save to Firebase Storage + Firestore (saveImage2Firebase)
 * 5. Return result to orchestrator (orchestrator handles task/cycle updates)
 */
export async function generateImages(
  input: GenerateImagesInput
): Promise<GenerateImagesOutput> {
  const { tenantId, templateId, cycleId, taskId } = input;

  console.log('\n========================================');
  console.log('[Generate Images] START');
  console.log('========================================');
  console.log('[Generate Images] Task ID:', taskId);
  console.log('[Generate Images] Cycle ID:', cycleId);

  try {
    // Step 1: Read task to get image parameters
    console.log('[Generate Images] Step 1: Reading task...');
    const task = await readTask(tenantId, templateId, cycleId, taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.type !== 'imageGeneration') {
      throw new Error(`Task ${taskId} is not an imageGeneration task (type: ${task.type})`);
    }

    if (task.status === 'completed') {
      console.log('[Generate Images] ⚠️ Task already completed, returning existing results');
      return {
        success: true,
        imagesGenerated: task.result?.imageIds?.length || 0,
        imageIds: task.result?.imageIds || [],
        imageUrls: task.result?.imageUrls || [],
        taskId
      };
    }

    console.log('[Generate Images] ✓ Task loaded');
    console.log('[Generate Images] Parameters:', JSON.stringify(task.parameters, null, 2));

    // Update task to in_progress
    await updateTask({
      tenantId,
      templateId,
      cycleId,
      taskId,
      status: 'in_progress'
    });

    // Step 2: Build comprehensive prompt with context
    console.log('[Generate Images] Step 2: Building image prompt...');
    const promptResult = await buildImagePrompt({
      tenantId,
      templateId,
      cycleId,
      taskId,
      imageParameters: task.parameters
    });

    console.log('[Generate Images] ✓ Prompt built successfully');
    console.log('[Generate Images] Prompt length:', promptResult.fullPrompt.length, 'characters');

    // Step 3: Generate image using nanoBanana
    console.log('[Generate Images] Step 3: Generating image...');
    const imageResult = await generateImage({
      prompt: promptResult.fullPrompt,
      aspectRatio: promptResult.metadata.dimensions || '16:9',
      quality: 'high'
    });

    if (!imageResult.success || !imageResult.imageBuffer) {
      throw new Error(imageResult.error || 'Image generation failed');
    }

    console.log('[Generate Images] ✓ Image generated successfully');

    // Step 4: Save to Firebase Storage + Firestore
    console.log('[Generate Images] Step 4: Saving image to Firebase...');
    const savedImage = await saveImage2Firebase({
      tenantId,
      templateId,
      imageBuffer: imageResult.imageBuffer,
      cycleId,
      taskId,
      metadata: {
        purpose: promptResult.metadata.purpose,
        dimensions: promptResult.metadata.dimensions,
        style: promptResult.metadata.style
      }
    });

    console.log('[Generate Images] ✓ Image saved to Firebase');
    console.log('[Generate Images] Image ID:', savedImage.imageId);
    console.log('[Generate Images] Public URL:', savedImage.url);
    console.log('[Generate Images] ✓ COMPLETE');
    console.log('========================================\n');

    // Return result - orchestrator will handle state management
    return {
      success: true,
      imagesGenerated: 1,
      imageIds: [savedImage.imageId],
      imageUrls: [savedImage.url],
      taskId,
      result: {
        imageIds: [savedImage.imageId],
        imageUrls: [savedImage.url],
        storagePaths: [savedImage.storagePath],
        metadata: promptResult.metadata
      }
    };
  } catch (error) {
    console.error('[Generate Images] ❌ ERROR:', error);
    console.error('[Generate Images] Error details:', error instanceof Error ? error.stack : 'Unknown');
    console.log('========================================\n');

    // Let orchestrator handle error state management
    throw error;
  }
}
