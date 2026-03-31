import { db } from '../../../../config/firestore';
import { ImageRecord } from './getImage';

export interface ListImagesFilters {
  source?: string;
  sourceId?: string;
  tags?: string[];
  limit?: number;
}

export interface ListImagesOutput {
  images: ImageRecord[];
  total: number;
}

/**
 * List images from the library with optional filtering
 *
 * @param tenantId - Tenant ID
 * @param filters - Optional filters (source, sourceId, tags, limit)
 * @returns Array of images and total count
 */
export async function listImages(
  tenantId: string,
  filters: ListImagesFilters = {}
): Promise<ListImagesOutput> {
  console.log('[List Images] Fetching images with filters:', filters);

  try {
    let query: any = db
      .collection('tenants')
      .doc(tenantId)
      .collection('creativeStudio')
      .doc('imageLibrary')
      .collection('images')
      .orderBy('createdAt', 'desc');

    // Apply filters
    if (filters.source) {
      query = query.where('source', '==', filters.source);
    }

    if (filters.sourceId) {
      query = query.where('sourceId', '==', filters.sourceId);
    }

    if (filters.tags && filters.tags.length > 0) {
      // Note: Firestore array-contains can only filter by one tag at a time
      // For multiple tags, we filter in memory after fetching
      query = query.where('tags', 'array-contains', filters.tags[0]);
    }

    // Apply limit
    const limit = filters.limit || 50;
    query = query.limit(limit);

    const snapshot = await query.get();

    let images: ImageRecord[] = snapshot.docs.map((doc: any) => {
      const data = doc.data();
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
    });

    // Filter by additional tags in memory if needed
    if (filters.tags && filters.tags.length > 1) {
      images = images.filter(img =>
        filters.tags!.every(tag => img.tags.includes(tag))
      );
    }

    console.log('[List Images]  Found', images.length, 'images');

    return {
      images,
      total: images.length
    };
  } catch (error) {
    console.error('[List Images] Error listing images:', error);
    throw new Error(
      `Failed to list images: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
