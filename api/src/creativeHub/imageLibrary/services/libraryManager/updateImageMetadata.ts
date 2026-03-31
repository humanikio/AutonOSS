import { db } from '../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export interface UpdateMetadataInput {
  purpose?: string;
  tags?: string[];
  [key: string]: any; // Allow other metadata fields
}

/**
 * Update image metadata in the library
 *
 * @param tenantId - Tenant ID
 * @param fileId - File ID
 * @param metadata - Fields to update
 */
export async function updateImageMetadata(
  tenantId: string,
  fileId: string,
  metadata: UpdateMetadataInput
): Promise<void> {
  console.log('[Update Image Metadata] Updating image:', fileId);
  console.log('[Update Image Metadata] Metadata:', metadata);

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('creativeStudio')
      .doc('imageLibrary')
      .collection('images')
      .doc(fileId);

    // Check if document exists
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Image not found');
    }

    // Build update object
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp()
    };

    // Add provided metadata fields
    if (metadata.purpose !== undefined) updateData.purpose = metadata.purpose;
    if (metadata.tags !== undefined) updateData.tags = metadata.tags;

    // Add any additional fields
    Object.keys(metadata).forEach(key => {
      if (key !== 'purpose' && key !== 'tags' && metadata[key] !== undefined) {
        updateData[key] = metadata[key];
      }
    });

    await docRef.update(updateData);

    console.log('[Update Image Metadata]  Metadata updated');
  } catch (error) {
    console.error('[Update Image Metadata] Error updating metadata:', error);
    throw new Error(
      `Failed to update image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
