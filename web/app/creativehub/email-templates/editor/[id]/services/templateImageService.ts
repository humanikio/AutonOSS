/**
 * Template Image Service
 * Manages template-specific image references
 */

export interface TemplateImage {
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

export interface ListTemplateImagesResponse {
  success: boolean;
  images: TemplateImage[];
  totalImages: number;
}

export interface AddImageToTemplateRequest {
  tenantId: string;
  libraryImageId: string;
}

export interface AddImageToTemplateResponse {
  success: boolean;
  templateImage: {
    id: string;
    url: string;
    storagePath: string;
    purpose?: string;
    dimensions?: string;
    style?: string;
    createdAt: string;
    addedFrom: string;
    librarySource: boolean;
  };
}

export interface RemoveImageFromTemplateResponse {
  success: boolean;
  imageId: string;
}

class TemplateImageService {
  /**
   * List all images associated with a template
   */
  async listTemplateImages(
    tenantId: string,
    templateId: string,
    token: string
  ): Promise<ListTemplateImagesResponse> {
    try {
      console.log('[Template Images] Fetching images for template:', templateId);

      const response = await fetch(
        `/api/template-agent/templates/${templateId}/images?tenantId=${tenantId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[Template Images] ✓ Fetched images:', data.totalImages);

      // Convert createdAt strings to Date objects
      const images: TemplateImage[] = data.images.map((img: any) => ({
        ...img,
        createdAt: new Date(img.createdAt)
      }));

      return {
        success: true,
        images,
        totalImages: data.totalImages
      };
    } catch (error) {
      console.error('[Template Images] Error fetching images:', error);
      throw error;
    }
  }

  /**
   * Add a library image reference to a template
   */
  async addImageToTemplate(
    tenantId: string,
    templateId: string,
    libraryImageId: string,
    token: string
  ): Promise<AddImageToTemplateResponse> {
    try {
      console.log('[Template Images] Adding library image to template');
      console.log('[Template Images] Library Image ID:', libraryImageId);
      console.log('[Template Images] Template ID:', templateId);

      const response = await fetch(
        `/api/template-agent/templates/${templateId}/images`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tenantId,
            libraryImageId
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: AddImageToTemplateResponse = await response.json();
      console.log('[Template Images] ✓ Image added:', data.templateImage.id);

      return data;
    } catch (error) {
      console.error('[Template Images] Error adding image:', error);
      throw error;
    }
  }

  /**
   * Remove an image reference from a template
   * (Does NOT delete from library or storage, only the reference)
   */
  async removeImageFromTemplate(
    tenantId: string,
    templateId: string,
    imageId: string,
    token: string
  ): Promise<RemoveImageFromTemplateResponse> {
    try {
      console.log('[Template Images] Removing image from template');
      console.log('[Template Images] Image ID:', imageId);
      console.log('[Template Images] Template ID:', templateId);

      const response = await fetch(
        `/api/template-agent/templates/${templateId}/images/${imageId}?tenantId=${tenantId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: RemoveImageFromTemplateResponse = await response.json();
      console.log('[Template Images] ✓ Image reference removed');

      return data;
    } catch (error) {
      console.error('[Template Images] Error removing image:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const templateImageService = new TemplateImageService();
