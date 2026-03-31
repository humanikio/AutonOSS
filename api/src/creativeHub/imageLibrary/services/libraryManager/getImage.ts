import { db } from '../../../../config/firestore';

export interface ImageRecord {
  id: string;
  url: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  source: string;
  sourceId?: string;
  purpose?: string;
  tags: string[];
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
}

/**
 * Get a single image from the library
 *
 * @param tenantId - Tenant ID
 * @param fileId - File ID
 * @returns Image record or null if not found
 */
export async function getImage(
  tenantId: string,
  fileId: string
): Promise<ImageRecord | null> {
  console.log('[Get Image] Fetching image:', fileId);

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('creativeStudio')
      .doc('imageLibrary')
      .collection('images')
      .doc(fileId);

    const doc = await docRef.get();

    if (!doc.exists) {
      console.log('[Get Image] Image not found');
      return null;
    }

    const data = doc.data();

    if (!data) {
      return null;
    }

    console.log('[Get Image] ✓ Image found');

    return {
      id: data.id,
      url: data.url,
      storagePath: data.storagePath,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      source: data.source,
      sourceId: data.sourceId,
      purpose: data.purpose,
      tags: data.tags || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('[Get Image] Error fetching image:', error);
    throw new Error(
      `Failed to get image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
