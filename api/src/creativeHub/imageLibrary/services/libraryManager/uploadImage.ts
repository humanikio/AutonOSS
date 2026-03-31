import { v4 as uuidv4 } from 'uuid';
import { storage } from '../../../../config/firebase';
import { db } from '../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export interface UploadImageInput {
  tenantId: string;
  imageBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
  metadata: {
    source: string;          // REQUIRED: "emailTemplate", "contentStudio", "manual", etc.
    sourceId?: string;       // Optional reference ID
    purpose?: string;        // "header", "icon", "background", etc.
    tags?: string[];         // Array of tags
    createdBy?: string;      // User ID
  };
}

export interface UploadImageOutput {
  fileId: string;
  url: string;
  storagePath: string;
}

/**
 * Upload an image to the central library
 *
 * Storage Path: tenants/{tenantId}/creativeStudio/imageLibrary/{fileId}.{ext}
 * Firestore Path: /tenants/{tenantId}/creativeStudio/imageLibrary/{fileId}
 *
 * @param input - Image data and metadata
 * @returns File ID, URL, and storage path
 */
export async function uploadImage(
  input: UploadImageInput
): Promise<UploadImageOutput> {
  const { tenantId, imageBuffer, fileName, mimeType, fileSize, metadata } = input;

  console.log('[Upload Image] Starting upload...');
  console.log('[Upload Image] File name:', fileName);
  console.log('[Upload Image] File size:', fileSize, 'bytes');
  console.log('[Upload Image] MIME type:', mimeType);
  console.log('[Upload Image] Source:', metadata.source);

  try {
    // Generate UUID for file
    const fileId = uuidv4();

    // Determine file extension from MIME type
    const ext = mimeType.split('/')[1] || 'png';

    // Storage path: tenants/{tenantId}/creativeStudio/imageLibrary/{fileId}.{ext}
    const storagePath = `tenants/${tenantId}/creativeStudio/imageLibrary/${fileId}.${ext}`;

    console.log('[Upload Image] File ID:', fileId);
    console.log('[Upload Image] Storage path:', storagePath);

    // Upload to Firebase Storage
    console.log('[Upload Image] Uploading to Firebase Storage...');
    const file = storage.bucket().file(storagePath);

    await file.save(imageBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          fileId,
          originalFileName: fileName,
          source: metadata.source,
          sourceId: metadata.sourceId || '',
          purpose: metadata.purpose || '',
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Get public URL (Firebase Storage with uniform bucket-level access)
    const bucketName = storage.bucket().name;
    const encodedPath = encodeURIComponent(storagePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;

    console.log('[Upload Image] ✓ Uploaded to storage');
    console.log('[Upload Image] Public URL:', url);

    // Create Firestore document in central library
    console.log('[Upload Image] Creating Firestore document...');
    const libraryDocRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('creativeStudio')
      .doc('imageLibrary')
      .collection('images')
      .doc(fileId);

    await libraryDocRef.set({
      id: fileId,
      url,
      storagePath,
      fileName,
      fileSize,
      mimeType,

      // Metadata
      source: metadata.source,
      sourceId: metadata.sourceId || null,
      purpose: metadata.purpose || null,
      tags: metadata.tags || [],

      // Timestamps
      createdAt: FieldValue.serverTimestamp(),
      createdBy: metadata.createdBy || null,
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log('[Upload Image] ✓ Firestore document created');
    console.log('[Upload Image] ✓ Upload complete!');

    return {
      fileId,
      url,
      storagePath
    };
  } catch (error) {
    console.error('[Upload Image] ❌ Error uploading image:', error);
    throw new Error(
      `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
