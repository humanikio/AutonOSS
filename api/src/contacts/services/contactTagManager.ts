/**
 * Contact Tag Manager Service
 * Orchestrates CRUD operations for contact tag definitions
 */

import { ContactTag } from './contactTags/getContactTags';
import { CreateContactTagRequest } from './contactTags/createContactTag';
import { getContactTags } from './contactTags/getContactTags';
import { createContactTag } from './contactTags/createContactTag';
import { deleteContactTag } from './contactTags/deleteContactTag';

// Re-export types and functions for external use
export { ContactTag, CreateContactTagRequest };

export class ContactTagManager {
  /**
   * Get all contact tags for a tenant
   * @param tenantId - Tenant ID
   */
  async getAllTags(tenantId: string): Promise<ContactTag[]> {
    return getContactTags(tenantId);
  }

  /**
   * Create new contact tag
   * @param tenantId - Tenant ID
   * @param data - Tag data
   */
  async createTag(tenantId: string, data: CreateContactTagRequest): Promise<ContactTag> {
    return createContactTag(tenantId, data);
  }

  /**
   * Delete contact tag
   * @param tenantId - Tenant ID
   * @param tagId - Tag ID
   */
  async deleteTag(tenantId: string, tagId: string): Promise<void> {
    return deleteContactTag(tenantId, tagId);
  }
}

export const contactTagManager = new ContactTagManager();
