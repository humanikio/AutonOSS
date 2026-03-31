import nanoBanana from '../../../llmModels/nanoBanana';
import { getAvatarPromptVariation } from './generalVariations/createAvatarImage';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

interface GenerateImageOptions {
  type: 'avatar';
  selfieData: string;
  userId: string;
}

interface GenerateImageResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Generate stylized images using the nanoBanana service
 */
export const generateGeneralImage = async (options: GenerateImageOptions): Promise<GenerateImageResult> => {
  try {
    const { type, selfieData, userId } = options;

    if (type !== 'avatar') {
      return {
        success: false,
        error: 'Only avatar generation is currently supported'
      };
    }

    console.log(`<� Starting avatar generation for user: ${userId}`);

    // Convert base64 selfie data to Buffer
    const base64Data = selfieData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    console.log(`=� Converted selfie data to buffer, size: ${imageBuffer.length} bytes`);

    // Get the avatar generation prompt
    const avatarPrompt = getAvatarPromptVariation('business');

    console.log(`<� Using avatar prompt variation: business`);

    // Generate the avatar using nanoBanana
    const result = await nanoBanana.editImage({
      prompt: avatarPrompt,
      baseImage: imageBuffer,
      preserveDetails: true,
      editingMode: 'style_transfer'
    });

    if (!result.success || !result.imageBuffer) {
      console.error(`L Avatar generation failed:`, result.error);
      return {
        success: false,
        error: result.error || 'Failed to generate avatar image'
      };
    }

    console.log(` Avatar generated successfully, uploading to Firebase Storage`);

    // Upload the generated avatar to Firebase Storage
    const storage = admin.storage();
    const bucket = storage.bucket();
    
    const fileName = `avatar-${Date.now()}-${uuidv4()}.png`;
    const filePath = `users/${userId}/avatar/generatedImages/${fileName}`;
    
    const file = bucket.file(filePath);
    
    await file.save(result.imageBuffer, {
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=86400'
      }
    });

    // Get a signed URL for public access (works with uniform bucket-level access)
    const [publicUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2030' // Long expiration for avatar images
    });

    console.log(`= Avatar uploaded to: ${publicUrl}`);

    return {
      success: true,
      avatarUrl: publicUrl
    };

  } catch (error) {
    console.error('L Generate general image error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: `Avatar generation service failed: ${errorMessage}`
    };
  }
};