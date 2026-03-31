/**
 * Field Group Manager Service
 * Orchestrates CRUD operations for field group definitions
 */

import {
  FieldGroup,
  CreateFieldGroupRequest,
  UpdateFieldGroupRequest,
  GetFieldGroupsQuery,
} from '../types';

import {
  getAllGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
} from './customFieldGroupCrud/index';

// Re-export CRUD functions for external use
export {
  getAllGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
};

export class FieldGroupManager {
  /**
   * Get all field groups for a tenant
   * @param tenantId - Tenant ID
   * @param query - Optional filters
   */
  async getAllGroups(
    tenantId: string,
    query?: GetFieldGroupsQuery
  ): Promise<FieldGroup[]> {
    return getAllGroups(tenantId, query);
  }

  /**
   * Get single field group by ID
   * @param tenantId - Tenant ID
   * @param groupId - Group ID
   */
  async getGroup(tenantId: string, groupId: string): Promise<FieldGroup | null> {
    return getGroup(tenantId, groupId);
  }

  /**
   * Create new field group
   * @param tenantId - Tenant ID
   * @param data - Group data
   */
  async createGroup(
    tenantId: string,
    data: CreateFieldGroupRequest
  ): Promise<FieldGroup> {
    return createGroup(tenantId, data);
  }

  /**
   * Update field group
   * @param tenantId - Tenant ID
   * @param groupId - Group ID
   * @param data - Updated group data
   */
  async updateGroup(
    tenantId: string,
    groupId: string,
    data: UpdateFieldGroupRequest
  ): Promise<FieldGroup> {
    return updateGroup(tenantId, groupId, data);
  }

  /**
   * Delete field group
   * @param tenantId - Tenant ID
   * @param groupId - Group ID
   */
  async deleteGroup(tenantId: string, groupId: string): Promise<void> {
    return deleteGroup(tenantId, groupId);
  }
}

export const fieldGroupManager = new FieldGroupManager();
