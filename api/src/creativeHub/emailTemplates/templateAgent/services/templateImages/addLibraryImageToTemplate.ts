/**
 * Add Library Image to Template
 * Creates a reference to an existing library image in the template's images collection
 * Does NOT duplicate the file - just creates a Firestore reference
 */

import { db } from '../../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export interface AddLibraryImageInput {
  tenantId: string;
  templateId: string;
  libraryImageId: string;
}

export interface AddLibraryImageOutput {
  imageId: string;
  url: string;
  storagePath: string;
  purpose?: string;
  dimensions?: string;
  style?: string;
}

/**
 * Add an existing library image to a template
 * Creates a reference document without duplicating the file
 *
 * @param input - Template and library image IDs
 * @returns Image reference data
 */
export async function addLibraryImageToTemplate(
  input: AddLibraryImageInput
): Promise<AddLibraryImageOutput> {
  const { tenantId, templateId, libraryImageId } = input;

  try {
    console.log('[Add Library Image] Adding library image to template...');
    console.log('[Add Library Image] Library Image ID:', libraryImageId);
    console.log('[Add Library Image] Template ID:', templateId);

    // Step 1: Fetch image metadata from centralized library
    const libraryImageRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('creativeStudio')
      .doc('imageLibrary')
      .collection('images')
      .doc(libraryImageId);

    const libraryImageDoc = await libraryImageRef.get();

    if (!libraryImageDoc.exists) {
      throw new Error(`Library image ${libraryImageId} not found`);
    }

    const libraryData = libraryImageDoc.data();
    if (!libraryData) {
      throw new Error('Library image has no data');
    }

    console.log('[Add Library Image] ✓ Library image found:', libraryData.fileName);

    // Step 2: Check if reference already exists in template
    const templateImageRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('images')
      .doc(libraryImageId);

    const existingRef = await templateImageRef.get();

    if (existingRef.exists) {
      console.log('[Add Library Image] ⚠️ Image already exists in template, returning existing reference');
      const existingData = existingRef.data();
      return {
        imageId: libraryImageId,
        url: existingData?.url || libraryData.url,
        storagePath: existingData?.storagePath || libraryData.storagePath,
        purpose: existingData?.purpose,
        dimensions: existingData?.dimensions,
        style: existingData?.style
      };
    }

    // Step 3: Create reference document in template's images collection
    console.log('[Add Library Image] Creating template reference...');
    await templateImageRef.set({
      id: libraryImageId,
      url: libraryData.url,
      storagePath: libraryData.storagePath,
      purpose: libraryData.purpose || null,
      dimensions: null, // Can be added later if needed
      style: null, // Can be added later if needed
      createdAt: FieldValue.serverTimestamp(),
      addedFrom: 'library', // Mark that this was added from library, not AI-generated
      librarySource: true,
      metadata: {
        originalFileName: libraryData.fileName,
        originalSource: libraryData.source,
        originalCreatedAt: libraryData.createdAt
      }
    });

    console.log('[Add Library Image] ✓ Template reference created');

    return {
      imageId: libraryImageId,
      url: libraryData.url,
      storagePath: libraryData.storagePath,
      purpose: libraryData.purpose
    };
  } catch (error) {
    console.error('[Add Library Image] ❌ Error:', error);
    throw new Error(
      `Failed to add library image to template: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
