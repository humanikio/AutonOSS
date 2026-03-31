/**
 * Image Library Service
 * Fetches images from the centralized image library
 */

export interface LibraryImage {
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

export interface ListLibraryImagesResponse {
  success: boolean;
  images: LibraryImage[];
  total: number;
}

class ImageLibraryService {
  /**
   * List images from the centralized library
   * @param tenantId - Tenant ID
   * @param token - Auth token
   * @param filters - Optional filters (source, sourceId, tags, limit)
   */
  async listLibraryImages(
    tenantId: string,
    token: string,
    filters?: {
      source?: string;
      sourceId?: string;
      tags?: string[];
      limit?: number;
    }
  ): Promise<ListLibraryImagesResponse> {
    try {
      console.log('[Image Library] Fetching library images with filters:', filters);

      // Build query string
      const params = new URLSearchParams({ tenantId });

      if (filters?.source) {
        params.append('source', filters.source);
      }

      if (filters?.sourceId) {
        params.append('sourceId', filters.sourceId);
      }

      if (filters?.tags && filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }

      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }

      const response = await fetch(`/api/image-library?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[Image Library] ✓ Fetched library images:', data.total);

      // Convert date strings to Date objects
      const images: LibraryImage[] = data.images.map((img: any) => ({
        ...img,
        createdAt: new Date(img.createdAt),
        updatedAt: new Date(img.updatedAt)
      }));

      return {
        success: true,
        images,
        total: data.total
      };
    } catch (error) {
      console.error('[Image Library] Error fetching library images:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const imageLibraryService = new ImageLibraryService();
