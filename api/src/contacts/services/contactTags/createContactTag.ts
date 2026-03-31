/**
 * Create Contact Tag
 * Creates a new contact tag definition
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { ContactTag } from './getContactTags';
import { getContactTags } from './getContactTags';

export interface CreateContactTagRequest {
  tagName: string;
}

export async function createContactTag(
  tenantId: string,
  data: CreateContactTagRequest
): Promise<ContactTag> {
  console.log(`<÷  Creating contact tag "${data.tagName}" for tenant ${tenantId}`);

  const db = getFirestore();

  try {
    // Validate tag name
    if (!data.tagName || !data.tagName.trim()) {
      throw new Error('Tag name is required');
    }

    const tagName = data.tagName.trim();

    // Check if tag name already exists
    const existingTags = await getContactTags(tenantId);
    const nameExists = existingTags.some((tag) => tag.tagName.toLowerCase() === tagName.toLowerCase());

    if (nameExists) {
      throw new Error(`Tag name "${tagName}" already exists`);
    }

    const now = Timestamp.now();
    const tagId = uuidv4();

    const contactTag: ContactTag = {
      tagId,
      tagName,
      timestamp: now,
    };

    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contactTags')
      .doc(tagId)
      .set(contactTag);

    console.log(` Contact tag "${tagName}" created with ID ${tagId}`);
    return contactTag;
  } catch (error) {
    console.error('L Error creating contact tag:', error);
    throw new Error(`Failed to create contact tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
