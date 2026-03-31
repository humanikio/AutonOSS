/**
 * Custom Field Manager Service
 * Orchestrates CRUD operations for custom field definitions
 *
 * This is a lightweight orchestrator that delegates to individual modules
 */

import {
  CustomFieldDefinition,
  CreateCustomFieldRequest,
  UpdateCustomFieldRequest,
  GetCustomFieldsQuery,
  EntityScope,
} from '../types';

import {
  getAllFields,
  getField,
  createField,
  updateField,
  deleteField,
  isFieldNameAvailable,
} from './customFieldManager/index';

export class CustomFieldManager {
  /**
   * Get all custom fields for a tenant
   * @param tenantId - Tenant ID
   * @param query - Optional filters
   */
  async getAllFields(
    tenantId: string,
    query?: GetCustomFieldsQuery
  ): Promise<CustomFieldDefinition[]> {
    return getAllFields(tenantId, query);
  }

  /**
   * Get single custom field by ID
   * @param tenantId - Tenant ID
   * @param fieldId - Field ID
   */
  async getField(tenantId: string, fieldId: string): Promise<CustomFieldDefinition | null> {
    return getField(tenantId, fieldId);
  }

  /**
   * Create new custom field
   * @param tenantId - Tenant ID
   * @param userId - User creating the field
   * @param data - Field data
   * @param overrides - Internal overrides for system fields
   */
  async createField(
    tenantId: string,
    userId: string,
    data: CreateCustomFieldRequest,
    overrides?: {
      isSystemField?: boolean;
      isDefault?: boolean;
    }
  ): Promise<CustomFieldDefinition> {
    return createField(tenantId, userId, data, overrides);
  }

  /**
   * Update custom field
   * @param tenantId - Tenant ID
   * @param fieldId - Field ID
   * @param data - Updated field data
   */
  async updateField(
    tenantId: string,
    fieldId: string,
    data: UpdateCustomFieldRequest
  ): Promise<CustomFieldDefinition> {
    return updateField(tenantId, fieldId, data);
  }

  /**
   * Delete custom field
   * @param tenantId - Tenant ID
   * @param fieldId - Field ID
   */
  async deleteField(tenantId: string, fieldId: string): Promise<void> {
    return deleteField(tenantId, fieldId);
  }

  /**
   * Check if field name is available for a given entity scope
   * @param tenantId - Tenant ID
   * @param name - Field name to check
   * @param entityScope - Entity scope
   */
  async isFieldNameAvailable(
    tenantId: string,
    name: string,
    entityScope: EntityScope
  ): Promise<boolean> {
    return isFieldNameAvailable(tenantId, name, entityScope);
  }
}

export const customFieldManager = new CustomFieldManager();
