/**
 * Remove Image from Template
 * Deletes the image reference from the template's images collection
 * Does NOT delete the file from storage or the library - just removes the reference
 */

import { db } from '../../../../../config/firestore';

export interface RemoveImageInput {
  tenantId: string;
  templateId: string;
  imageId: string;
}

export interface RemoveImageOutput {
  success: boolean;
  imageId: string;
}

/**
 * Remove an image reference from a template
 * Only deletes the reference, not the actual file or library entry
 *
 * @param input - Template and image IDs
 * @returns Success status
 */
export async function removeImageFromTemplate(
  input: RemoveImageInput
): Promise<RemoveImageOutput> {
  const { tenantId, templateId, imageId } = input;

  try {
    console.log('[Remove Image] Removing image from template...');
    console.log('[Remove Image] Image ID:', imageId);
    console.log('[Remove Image] Template ID:', templateId);

    // Delete reference document from template's images collection
    const templateImageRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('images')
      .doc(imageId);

    const doc = await templateImageRef.get();

    if (!doc.exists) {
      console.log('[Remove Image] ⚠️ Image reference not found (already removed)');
      return {
        success: true,
        imageId
      };
    }

    await templateImageRef.delete();

    console.log('[Remove Image] ✓ Image reference deleted');
    console.log('[Remove Image] Note: Library image and storage file remain intact');

    return {
      success: true,
      imageId
    };
  } catch (error) {
    console.error('[Remove Image] ❌ Error:', error);
    throw new Error(
      `Failed to remove image from template: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
