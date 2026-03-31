export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'email'
  | 'phone'
  | 'url'
  | 'textarea';

export type EntityScope = 'contact' | 'opportunity' | 'company' | 'deal';

export interface SelectOption {
  label: string;
  value: string;
  color?: string;
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  options?: SelectOption[];
}

export interface CustomFieldDefinition {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  description?: string;
  type: FieldType;
  entityScope: EntityScope;
  group?: string;
  placeholder?: string;
  validation: FieldValidation;
  isSystemField: boolean;
  isDefault: boolean;
  order: number;
  createdAt: any;
  updatedAt: any;
  createdBy?: string;
}

export interface FieldGroup {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  description?: string;
  entityScope: EntityScope;
  icon?: string;
  color?: string;
  order: number;
  isSystemGroup: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface CreateFieldGroupRequest {
  name: string;
  displayName: string;
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

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

class CustomFieldsAPI {
  private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  private get apiURL() {
    const base = this.baseURL.replace('/api', '');
    return `${base}/api`;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & { token?: string } = {}
  ): Promise<APIResponse<T>> {
    const { token, ...fetchOptions } = options;

    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const url = `${this.apiURL}${endpoint}`;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[CustomFieldsAPI] Making request to: ${url}`);
      console.log(`[CustomFieldsAPI] Method: ${fetchOptions.method || 'GET'}`);
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      console.error(`[CustomFieldsAPI] Request failed: ${response.status} ${response.statusText}`);

      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all custom fields
   * @param token - Auth token
   * @param query - Query options
   * @param query.entityScope - Filter by entity scope (contact, opportunity, etc.)
   * @param query.group - Filter by group
   * @param query.includeSystem - Include system fields (default: false - must explicitly opt-in)
   */
  async getAllFields(
    token: string,
    query?: {
      entityScope?: EntityScope;
      group?: string;
      includeSystem?: boolean;
    }
  ): Promise<{ fields: CustomFieldDefinition[]; count: number }> {
    const params = new URLSearchParams();
    if (query?.entityScope) params.append('entityScope', query.entityScope);
    if (query?.group) params.append('group', query.group);
    // Explicitly set includeSystem if provided (defaults to false on backend - must opt-in)
    if (query?.includeSystem !== undefined) {
      params.append('includeSystem', query.includeSystem.toString());
    }

    const queryString = params.toString();
    const endpoint = `/customFields${queryString ? `?${queryString}` : ''}`;

    const response = await this.makeRequest<CustomFieldDefinition[]>(endpoint, { token });
    return {
      fields: response.data || [],
      count: response.count || 0,
    };
  }

  /**
   * Get single custom field by ID
   */
  async getField(fieldId: string, token: string): Promise<CustomFieldDefinition> {
    const response = await this.makeRequest<CustomFieldDefinition>(`/customFields/${fieldId}`, { token });
    if (!response.data) {
      throw new Error('Field not found');
    }
    return response.data;
  }

  /**
   * Create a new custom field
   */
  async createField(
    data: CreateCustomFieldRequest,
    token: string
  ): Promise<CustomFieldDefinition> {
    const response = await this.makeRequest<CustomFieldDefinition>(`/customFields`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });

    if (!response.data) {
      throw new Error('Failed to create field');
    }

    return response.data;
  }

  /**
   * Update a custom field (display name only)
   */
  async updateField(
    fieldId: string,
    data: UpdateCustomFieldRequest,
    token: string
  ): Promise<CustomFieldDefinition> {
    const response = await this.makeRequest<CustomFieldDefinition>(`/customFields/${fieldId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });

    if (!response.data) {
      throw new Error('Failed to update field');
    }

    return response.data;
  }

  /**
   * Delete a custom field
   */
  async deleteField(fieldId: string, token: string): Promise<void> {
    await this.makeRequest<void>(`/customFields/${fieldId}`, {
      method: 'DELETE',
      token,
    });
  }

  /**
   * Check if field name is available
   */
  async checkFieldNameAvailability(
    name: string,
    entityScope: EntityScope,
    token: string
  ): Promise<boolean> {
    const response = await this.makeRequest<{ available: boolean }>(
      `/customFields/check-name/${name}?entityScope=${entityScope}`,
      { token }
    );
    return response.data?.available || false;
  }

  // ==================== Field Group Methods ====================

  /**
   * Get all field groups
   */
  async getAllGroups(
    token: string,
    query?: {
      entityScope?: EntityScope;
    }
  ): Promise<{ groups: FieldGroup[]; count: number }> {
    const params = new URLSearchParams();
    if (query?.entityScope) params.append('entityScope', query.entityScope);

    const queryString = params.toString();
    const endpoint = `/customFields/groups${queryString ? `?${queryString}` : ''}`;

    const response = await this.makeRequest<FieldGroup[]>(endpoint, { token });
    return {
      groups: response.data || [],
      count: response.count || 0,
    };
  }

  /**
   * Get single field group by ID
   */
  async getGroup(groupId: string, token: string): Promise<FieldGroup> {
    const response = await this.makeRequest<FieldGroup>(`/customFields/groups/${groupId}`, { token });
    if (!response.data) {
      throw new Error('Group not found');
    }
    return response.data;
  }

  /**
   * Create a new field group
   */
  async createGroup(
    data: CreateFieldGroupRequest,
    token: string
  ): Promise<FieldGroup> {
    const response = await this.makeRequest<FieldGroup>(`/customFields/groups`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });

    if (!response.data) {
      throw new Error('Failed to create group');
    }

    return response.data;
  }

  /**
   * Update a field group
   */
  async updateGroup(
    groupId: string,
    data: UpdateFieldGroupRequest,
    token: string
  ): Promise<FieldGroup> {
    const response = await this.makeRequest<FieldGroup>(`/customFields/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });

    if (!response.data) {
      throw new Error('Failed to update group');
    }

    return response.data;
  }

  /**
   * Delete a field group
   */
  async deleteGroup(groupId: string, token: string): Promise<void> {
    await this.makeRequest<void>(`/customFields/groups/${groupId}`, {
      method: 'DELETE',
      token,
    });
  }
}

export const customFieldsAPI = new CustomFieldsAPI();
