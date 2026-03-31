import { storage } from '../../../../config/firebase';
import { db } from '../../../../config/firestore';

/**
 * Delete an image from the library
 *
 * Deletes from both Storage and Firestore central library.
 * Note: Service-specific documents are NOT deleted (services handle their own cleanup)
 *
 * @param tenantId - Tenant ID
 * @param fileId - File ID
 */
export async function deleteImage(
  tenantId: string,
  fileId: string
): Promise<void> {
  console.log('[Delete Image] Deleting image:', fileId);

  try {
    // Step 1: Get the document to retrieve storage path
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('creativeStudio')
      .doc('imageLibrary')
      .collection('images')
      .doc(fileId);

    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Image not found');
    }

    const data = doc.data();
    const storagePath = data?.storagePath;

    if (!storagePath) {
      throw new Error('Storage path not found in document');
    }

    console.log('[Delete Image] Storage path:', storagePath);

    // Step 2: Delete from Firebase Storage
    console.log('[Delete Image] Deleting from storage...');
    const file = storage.bucket().file(storagePath);

    try {
      await file.delete();
      console.log('[Delete Image]  Deleted from storage');
    } catch (storageError) {
      // File might already be deleted or not exist
      console.warn('[Delete Image] � Storage delete warning:', storageError);
    }

    // Step 3: Delete Firestore document
    console.log('[Delete Image] Deleting Firestore document...');
    await docRef.delete();

    console.log('[Delete Image]  Image deleted successfully');
  } catch (error) {
    console.error('[Delete Image] Error deleting image:', error);
    throw new Error(
      `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
