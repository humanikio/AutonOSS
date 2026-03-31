/**
 * List Template Images
 * Fetches all image references for a template (simpler than fetchCurrentTemplateImages)
 * Does NOT include base64 data - just URLs and metadata for display
 */

import { db } from '../../../../../config/firestore';

export interface TemplateImageListItem {
  id: string;
  url: string;
  storagePath: string;
  purpose?: string;
  dimensions?: string;
  style?: string;
  createdAt: Date;
  addedFrom?: string; // 'library' or 'generated'
  librarySource?: boolean;
}

export interface ListTemplateImagesOutput {
  images: TemplateImageListItem[];
  totalImages: number;
}

/**
 * List all images for a template (without base64 conversion)
 * Lighter weight than fetchCurrentTemplateImages - for UI display only
 *
 * @param tenantId - Tenant ID
 * @param templateId - Template ID
 * @returns Array of image metadata
 */
export async function listTemplateImages(
  tenantId: string,
  templateId: string
): Promise<ListTemplateImagesOutput> {
  console.log('[List Template Images] Fetching images for template:', templateId);

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
      console.log('[List Template Images] No images found');
      return {
        images: [],
        totalImages: 0
      };
    }

    console.log('[List Template Images] Found', snapshot.size, 'images');

    const images: TemplateImageListItem[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        url: data.url,
        storagePath: data.storagePath,
        purpose: data.purpose || undefined,
        dimensions: data.dimensions || undefined,
        style: data.style || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        addedFrom: data.addedFrom || undefined,
        librarySource: data.librarySource || false
      };
    });

    console.log('[List Template Images] ✓ Successfully fetched', images.length, 'images');

    return {
      images,
      totalImages: images.length
    };
  } catch (error) {
    console.error('[List Template Images] Error:', error);
    throw new Error(
      `Failed to list template images: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
