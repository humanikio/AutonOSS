/**
 * Fetch Current Template Images
 * Retrieves all images for a template and converts them to base64 for LLM context
 */

import { db } from '../../../../config/firestore';
import { storage } from '../../../../config/firebase';

export interface TemplateImage {
  id: string;
  url: string;
  storagePath: string;
  purpose?: string;
  dimensions?: string;
  style?: string;
  base64: string;
  mimeType: string;
  createdAt: Date;
}

export interface FetchTemplateImagesOutput {
  images: TemplateImage[];
  totalImages: number;
}

/**
 * Download image from Firebase Storage and convert to base64
 */
async function downloadImageAsBase64(storagePath: string): Promise<string> {
  try {
    const file = storage.bucket().file(storagePath);
    const [buffer] = await file.download();
    return buffer.toString('base64');
  } catch (error) {
    console.error('[Download Image Base64] Error:', error);
    throw error;
  }
}

/**
 * Fetch all images for a template from Firestore and convert to base64
 *
 * @param tenantId - Tenant ID
 * @param templateId - Template ID
 * @returns Array of images with URLs and base64 data
 */
export async function fetchCurrentTemplateImages(
  tenantId: string,
  templateId: string
): Promise<FetchTemplateImagesOutput> {
  console.log('[Fetch Template Images] Fetching images for template:', templateId);

  try {
    // Query all images for this template
    const imagesRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('images')
      .orderBy('createdAt', 'desc');

    const snapshot = await imagesRef.get();

    if (snapshot.empty) {
      console.log('[Fetch Template Images] No images found');
      return {
        images: [],
        totalImages: 0
      };
    }

    console.log('[Fetch Template Images] Found', snapshot.size, 'images');

    // Fetch and convert each image to base64
    const images: TemplateImage[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      console.log('[Fetch Template Images] Processing image:', doc.id);

      try {
        // Download image from Firebase Storage and convert to base64
        const base64 = await downloadImageAsBase64(data.storagePath);

        images.push({
          id: doc.id,
          url: data.url,
          storagePath: data.storagePath,
          purpose: data.purpose,
          dimensions: data.dimensions,
          style: data.style,
          base64,
          mimeType: data.mimeType || 'image/png',
          createdAt: data.createdAt?.toDate() || new Date()
        });

        console.log('[Fetch Template Images]  Converted to base64:', doc.id);
      } catch (imageError) {
        console.error('[Fetch Template Images] Failed to fetch image:', doc.id, imageError);
        // Skip failed images, continue with others
      }
    }

    console.log('[Fetch Template Images]  Successfully fetched', images.length, 'images');

    return {
      images,
      totalImages: images.length
    };
  } catch (error) {
    console.error('[Fetch Template Images] Error:', error);
    throw new Error(
      `Failed to fetch template images: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
