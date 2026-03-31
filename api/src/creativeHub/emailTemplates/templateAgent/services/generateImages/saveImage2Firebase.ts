/**
 * Save Image to Firebase
 * Uses centralized image library and creates template-specific reference
 */

import { uploadImage } from '../../../../imageLibrary/services/libraryManager';
import { db } from '../../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export interface SaveImageInput {
  tenantId: string;
  templateId: string;
  imageBuffer: Buffer;
  cycleId: string;
  taskId: string;
  metadata?: {
    purpose?: string;
    dimensions?: string;
    style?: string;
    [key: string]: any;
  };
}

export interface SaveImageOutput {
  imageId: string;
  url: string;
  storagePath: string;
}

/**
 * Save image using centralized library and create template-specific reference
 *
 * Flow:
 * 1. Upload to centralized image library (Storage + Firestore)
 * 2. Create reference document in template's images collection
 *
 * @param input - Image data and metadata
 * @returns Image ID, URL, and storage path
 */
export async function saveImage2Firebase(
  input: SaveImageInput
): Promise<SaveImageOutput> {
  const { tenantId, templateId, imageBuffer, cycleId, taskId, metadata = {} } = input;

  try {
    // Step 1: Upload to centralized image library
    console.log('[Save Image] Uploading to centralized image library...');
    const libraryResult = await uploadImage({
      tenantId,
      imageBuffer,
      fileName: `email_template_${Date.now()}.png`,
      mimeType: 'image/png',
      fileSize: imageBuffer.length,
      metadata: {
        source: 'emailTemplate',
        sourceId: templateId,
        purpose: metadata.purpose || 'email_image',
        tags: ['emailTemplate', templateId]
      }
    });

    console.log('[Save Image] ✓ Uploaded to library:', libraryResult.fileId);
    console.log('[Save Image] Public URL:', libraryResult.url);

    // Step 2: Create reference document in template's images collection
    console.log('[Save Image] Creating template reference document...');
    const imageDocRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('images')
      .doc(libraryResult.fileId);

    await imageDocRef.set({
      id: libraryResult.fileId,
      url: libraryResult.url,
      storagePath: libraryResult.storagePath,
      purpose: metadata.purpose || 'email_image',
      dimensions: metadata.dimensions,
      style: metadata.style,
      createdAt: FieldValue.serverTimestamp(),
      cycleId,
      taskId,
      metadata
    });

    console.log('[Save Image] ✓ Template reference created');

    return {
      imageId: libraryResult.fileId,
      url: libraryResult.url,
      storagePath: libraryResult.storagePath
    };
  } catch (error) {
    console.error('[Save Image] ❌ Error saving image:', error);
    throw new Error(
      `Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
