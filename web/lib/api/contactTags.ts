export interface ContactTag {
  tagId: string;
  tagName: string;
  timestamp: any;
}

export interface CreateContactTagRequest {
  tagName: string;
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  tags?: T;
  tag?: T;
  error?: string;
  message?: string;
  count?: number;
}

class ContactTagsAPI {
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
      console.log(`[ContactTagsAPI] Making request to: ${url}`);
      console.log(`[ContactTagsAPI] Method: ${fetchOptions.method || 'GET'}`);
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      console.error(`[ContactTagsAPI] Request failed: ${response.status} ${response.statusText}`);

      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all contact tags
   */
  async getAllTags(token: string): Promise<{ tags: ContactTag[]; count: number }> {
    const response = await this.makeRequest<ContactTag[]>('/contacts/tags', { token });
    const tags = response.tags || response.data || [];
    return {
      tags: Array.isArray(tags) ? tags : [],
      count: Array.isArray(tags) ? tags.length : 0,
    };
  }

  /**
   * Create a new contact tag
   */
  async createTag(
    data: CreateContactTagRequest,
    token: string
  ): Promise<ContactTag> {
    const response = await this.makeRequest<ContactTag>('/contacts/tags', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });

    const tag = response.tag || response.data;
    if (!tag) {
      throw new Error('Failed to create tag');
    }

    return tag;
  }

  /**
   * Delete a contact tag
   */
  async deleteTag(tagId: string, token: string): Promise<void> {
    await this.makeRequest<void>(`/contacts/tags/${tagId}`, {
      method: 'DELETE',
      token,
    });
  }
}

export const contactTagsAPI = new ContactTagsAPI();
