/**
 * Save Content Studio Generated Images to Image Library
 * Allows users to save their AI-generated images to the central library for reuse
 */

import { storage } from '../../../config/firebase';
import { uploadImage } from '../../imageLibrary/services/libraryManager';
import { db } from '../../../config/firestore';

export interface SaveToLibraryInput {
  tenantId: string;
  sessionId: string;
  assetId: string;
  tags?: string[];
  purpose?: string;
}

export interface SaveToLibraryOutput {
  success: boolean;
  libraryFileId: string;
  libraryUrl: string;
  error?: string;
}

/**
 * Save a generated image from content studio to the central image library
 *
 * This downloads the image from the content session storage and re-uploads it
 * to the central library with proper metadata indicating it came from contentStudio
 */
export async function saveGeneratedImageToLibrary(
  input: SaveToLibraryInput
): Promise<SaveToLibraryOutput> {
  const { tenantId, sessionId, assetId, tags = [], purpose } = input;

  try {
    console.log(`📦 Saving image to library: ${assetId} from session ${sessionId}`);

    // Step 1: Get asset metadata from Firestore
    const assetDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contentSessions')
      .doc(sessionId)
      .collection('assets')
      .doc(assetId)
      .get();

    if (!assetDoc.exists) {
      throw new Error('Asset not found in content session');
    }

    const assetData = assetDoc.data();
    if (!assetData) {
      throw new Error('Asset data is empty');
    }

    // Step 2: Download the image from storage
    const storagePath = assetData.storagePath;
    const file = storage.bucket().file(storagePath);

    console.log(`📥 Downloading image from: ${storagePath}`);
    const [imageBuffer] = await file.download();
    const [metadata] = await file.getMetadata();

    // Step 3: Prepare metadata for library
    const libraryTags = [
      'ai-generated',
      'content-studio',
      ...(assetData.aspectRatio ? [assetData.aspectRatio] : []),
      ...(assetData.style ? [assetData.style] : []),
      ...tags
    ];

    // Step 4: Upload to library
    console.log(`📤 Uploading to image library...`);
    const uploadResult = await uploadImage({
      tenantId,
      imageBuffer,
      fileName: `content-studio-${assetId}.png`,
      mimeType: metadata.contentType || 'image/png',
      fileSize: imageBuffer.length,
      metadata: {
        source: 'contentStudio',
        sourceId: `${sessionId}/${assetId}`,
        purpose: purpose || 'ai-generated',
        tags: libraryTags,
        createdBy: assetData.createdBy || undefined
      }
    });

    console.log(`✅ Image saved to library: ${uploadResult.fileId}`);

    // Step 5: Update the original asset document to mark it as saved to library
    console.log(`📝 Updating asset document to mark as saved to library...`);
    await assetDoc.ref.update({
      isSavedToLibrary: true,
      libraryFileId: uploadResult.fileId,
      libraryUrl: uploadResult.url,
      savedToLibraryAt: new Date().toISOString()
    });

    console.log(`✅ Asset document updated successfully`);

    return {
      success: true,
      libraryFileId: uploadResult.fileId,
      libraryUrl: uploadResult.url
    };

  } catch (error) {
    console.error(`❌ Error saving to library:`, error);
    return {
      success: false,
      libraryFileId: '',
      libraryUrl: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
