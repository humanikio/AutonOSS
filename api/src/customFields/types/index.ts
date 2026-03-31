/**
 * Custom Fields Type Definitions
 * Supports multi-entity custom fields (contacts, opportunities, etc.)
 */

import { Timestamp } from 'firebase-admin/firestore';

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'      // Single choice
  | 'multiselect' // Multiple choices
  | 'email'       // String with email validation
  | 'phone'       // String with phone validation
  | 'url'         // String with URL validation
  | 'textarea';   // Long text

export type EntityScope =
  | 'contact'
  | 'opportunity'
  | 'company'
  | 'deal';

export interface SelectOption {
  label: string;
  value: string;
  color?: string;  // Hex color for UI rendering
}

export interface FieldValidation {
  required?: boolean;
  min?: number;        // Min length (string) or value (number)
  max?: number;        // Max length (string) or value (number)
  pattern?: string;    // Regex pattern
  options?: SelectOption[];  // For select/multiselect types
}

export interface CustomFieldDefinition {
  id: string;                    // UUID
  tenantId: string;              // Tenant scope
  name: string;                  // Machine name (e.g., 'leadScore')
  displayName: string;           // Human-readable name
  description?: string;          // Help text
  type: FieldType;
  entityScope: EntityScope;      // Which entity this field belongs to
  group?: string;                // Optional group ID for organization
  placeholder?: string;          // Input placeholder
  validation: FieldValidation;
  isSystemField: boolean;        // System fields can't be deleted/renamed
  isDefault: boolean;            // Auto-populated on entity creation
  hideFromUI?: boolean;          // Hide from contact details/conversations UI (but available in automations)
  order: number;                 // Display order within group
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;            // User ID who created (for custom fields)
}

export interface FieldGroup {
  id: string;                    // UUID or system identifier
  tenantId: string;
  name: string;                  // Machine name
  displayName: string;           // Human-readable name
  description?: string;          // Help text
  entityScope: EntityScope;      // Which entity this group belongs to
  icon?: string;                 // Icon string (e.g., 'fa:user')
  color?: string;                // Hex color for UI theming
  order: number;                 // Display order
  isSystemGroup: boolean;        // System groups can't be deleted
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Request/Response types
export interface CreateCustomFieldRequest {
  name: string;
  displayName: string;
  description?: string;
  type: FieldType;
  entityScope: EntityScope;
  group?: string;
  placeholder?: string;
  validation?: Partial<FieldValidation>;
  order?: number;
}

export interface UpdateCustomFieldRequest {
  displayName?: string;
  description?: string;
  placeholder?: string;
  validation?: Partial<FieldValidation>;
  group?: string;
  order?: number;
}

export interface GetCustomFieldsQuery {
  entityScope?: EntityScope;  // Filter by entity
  group?: string;             // Filter by group
  includeSystem?: boolean;    // Include system fields (default false - must opt-in)
  excludeInternal?: boolean;  // Exclude internal system fields like id, tenant_id, created_at (default true)
}

// Group Request/Response types
export interface CreateFieldGroupRequest {
  name: string;              // Machine name (e.g., 'sales_info')
  displayName: string;       // Human-readable name
  description?: string;
  entityScope: EntityScope;
  icon?: string;
  color?: string;
  order?: number;
}

export interface UpdateFieldGroupRequest {
  displayName?: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
}

export interface GetFieldGroupsQuery {
  entityScope?: EntityScope;  // Filter by entity
}
