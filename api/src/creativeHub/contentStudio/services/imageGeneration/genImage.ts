/**
 * Image generation module
 * Handles provider integration, image generation, and storage
 */

import { v4 as uuidv4 } from 'uuid';
import { storage } from '../../../../config/firebase';
import { db } from '../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import nanoBanana, { ImageGenerationOptions } from '../../../../llmModels/nanoBanana';
import { CompiledPrompt } from './buildPrompt';
import { GatheredData } from './gatherData';

export interface GeneratedAsset {
  id: string;
  url: string;
  storagePath: string;
  prompt: string;
  createdAt: Date;
  complimentaryColor?: string;
  isSavedToLibrary?: boolean;
  libraryFileId?: string;
  libraryUrl?: string;
}

/**
 * Available image generation providers
 */
const providers = {
  nanoBanana: nanoBanana
};

/**
 * Default provider (hardcoded for now, will be configurable later)
 */
const DEFAULT_PROVIDER = 'nanoBanana';

/**
 * Generate image using the specified provider
 */
export async function genImage(
  tenantId: string,
  sessionId: string,
  compiledPrompt: CompiledPrompt,
  gatheredData: GatheredData,
  providerId: string = DEFAULT_PROVIDER
): Promise<GeneratedAsset> {
  try {
    // Get provider
    const provider = providers[providerId as keyof typeof providers];
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Prepare generation options
    const options: ImageGenerationOptions = {
      prompt: compiledPrompt.final,
      aspectRatio: gatheredData.aspectRatio,
      quality: gatheredData.quality,
      inputImages: gatheredData.referenceImage ? [gatheredData.referenceImage] : undefined
    };

    console.log(`<� Generating image with ${providerId}...`);
    console.log(`=� Prompt length: ${compiledPrompt.final.length} characters`);

    // Generate image
    const result = await provider.generateImage(options);

    if (!result.success || !result.imageBuffer) {
      throw new Error(result.error || 'Image generation failed');
    }

    console.log(` Image generated successfully`);

    // Generate unique asset ID
    const assetId = uuidv4();

    // Upload to Firebase Storage
    const storagePath = `tenants/${tenantId}/contentSessions/${sessionId}/assets/${assetId}`;
    const file = storage.bucket().file(`${storagePath}.png`);

    console.log(`=� Uploading to storage: ${storagePath}.png`);

    await file.save(result.imageBuffer, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          tenantId,
          sessionId,
          assetId,
          originalPrompt: gatheredData.prompt,
          compiledPrompt: compiledPrompt.final,
          provider: providerId,
          generatedAt: new Date().toISOString()
        }
      }
    });

    // Generate a signed URL with long expiration (100 years)
    // This works with uniform bucket-level access
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000 // 100 years
    });
    const publicUrl = signedUrl;

    console.log(` Image uploaded successfully: ${publicUrl}`);

    // Save to Firestore
    const assetRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('contentSessions')
      .doc(sessionId)
      .collection('assets')
      .doc(assetId);

    const now = FieldValue.serverTimestamp();

    await assetRef.set({
      id: assetId,
      tenantId,
      sessionId,
      storagePath: `${storagePath}.png`,
      url: publicUrl,
      prompt: gatheredData.prompt,
      compiledPrompt: compiledPrompt.final,
      enhancements: compiledPrompt.enhancements,
      provider: providerId,
      aspectRatio: gatheredData.aspectRatio,
      quality: gatheredData.quality,
      style: gatheredData.style,
      complimentaryColor: compiledPrompt.complimentaryColor || '#6b7280', // Save AI-suggested background color
      isSavedToLibrary: false, // Initialize as not saved to library
      createdAt: now
    });

    console.log(` Asset document created in Firestore: ${assetId}`);

    // Fetch the document to get the actual timestamp
    const assetDoc = await assetRef.get();
    const assetData = assetDoc.data();

    return {
      id: assetId,
      url: publicUrl,
      storagePath: `${storagePath}.png`,
      prompt: gatheredData.prompt,
      createdAt: assetData?.createdAt?.toDate() || new Date(),
      complimentaryColor: compiledPrompt.complimentaryColor,
      isSavedToLibrary: false
    };
  } catch (error) {
    console.error('L Error in genImage:', error);
    throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all assets for a session
 */
export async function getSessionAssets(tenantId: string, sessionId: string): Promise<GeneratedAsset[]> {
  try {
    const assetsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contentSessions')
      .doc(sessionId)
      .collection('assets')
      .orderBy('createdAt', 'desc')
      .get();

    const assets: GeneratedAsset[] = [];

    assetsSnapshot.forEach(doc => {
      const data = doc.data();
      assets.push({
        id: doc.id,
        url: data.url,
        storagePath: data.storagePath,
        prompt: data.prompt,
        createdAt: data.createdAt?.toDate() || new Date(),
        complimentaryColor: data.complimentaryColor,
        isSavedToLibrary: data.isSavedToLibrary || false,
        libraryFileId: data.libraryFileId,
        libraryUrl: data.libraryUrl
      });
    });

    return assets;
  } catch (error) {
    console.error('Error getting session assets:', error);
    throw new Error('Failed to retrieve session assets');
  }
}
