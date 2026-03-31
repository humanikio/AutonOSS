/**
 * Contacts API Client
 * Handles contact management operations
 */

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UpdateContactRequest {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  tags?: string[];
  [key: string]: any;
}

class ContactsAPI {
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
      console.log(`[ContactsAPI] Making request to: ${url}`);
      console.log(`[ContactsAPI] Method: ${fetchOptions.method || 'GET'}`);
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      console.error(`[ContactsAPI] Request failed: ${response.status} ${response.statusText}`);

      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update contact information
   * @param contactId - Contact ID
   * @param updates - Fields to update
   * @param token - Auth token
   */
  async updateContact(
    contactId: string,
    updates: UpdateContactRequest,
    token: string
  ): Promise<void> {
    await this.makeRequest(`/contacts/${contactId}/manage`, {
      method: 'POST',
      body: JSON.stringify(updates),
      token,
    });
  }

  /**
   * Update contact tags
   * @param contactId - Contact ID
   * @param tagIds - Array of tag IDs to assign to contact
   * @param token - Auth token
   */
  async updateContactTags(
    contactId: string,
    tagIds: string[],
    token: string
  ): Promise<void> {
    await this.updateContact(contactId, { tags: tagIds }, token);
  }
}

export const contactsAPI = new ContactsAPI();
