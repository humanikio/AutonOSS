/**
 * Contact Profile Service
 * Handles API calls for AI-generated contact profiles
 */

export interface ContactProfile {
  profileId: string;
  tenantId: string;
  contactId: string;
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  data: {
    text: string;
  };
}

export interface ListProfilesResponse {
  success: boolean;
  message: string;
  data: {
    profiles: ContactProfile[];
    count: number;
  };
}

class ContactProfileService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  /**
   * Get all profiles for a contact
   */
  async getContactProfiles(tenantId: string, contactId: string, token: string): Promise<ContactProfile[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/universal-contact-memory/contact-profile/${tenantId}/${contactId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch contact profiles: ${response.statusText}`);
      }

      const data: ListProfilesResponse = await response.json();
      return data.data.profiles || [];
    } catch (error) {
      console.error('Error fetching contact profiles:', error);
      throw error;
    }
  }

  /**
   * Get the most recent profile for a contact
   */
  async getLatestProfile(tenantId: string, contactId: string, token: string): Promise<ContactProfile | null> {
    try {
      const profiles = await this.getContactProfiles(tenantId, contactId, token);

      if (profiles.length === 0) {
        return null;
      }

      // Profiles are already sorted by updatedAt DESC from the backend
      return profiles[0];
    } catch (error) {
      console.error('Error fetching latest profile:', error);
      return null;
    }
  }

  /**
   * Format timestamp to readable date
   */
  formatTimestamp(timestamp: { _seconds: number; _nanoseconds: number }): string {
    const date = new Date(timestamp._seconds * 1000 + Math.floor(timestamp._nanoseconds / 1000000));

    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  /**
   * Extract first N lines from profile text
   */
  extractPreview(text: string, maxLines: number = 3): string {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.slice(0, maxLines).join('\n');
  }

  /**
   * Update an existing contact profile
   */
  async updateProfile(
    tenantId: string,
    contactId: string,
    profileId: string,
    text: string,
    token: string
  ): Promise<ContactProfile> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/universal-contact-memory/contact-profile/${tenantId}/${contactId}/${profileId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            data: { text }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update contact profile: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating contact profile:', error);
      throw error;
    }
  }
}

export const contactProfileService = new ContactProfileService();
