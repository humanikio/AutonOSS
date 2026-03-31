interface InvitationData {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  subAccounts: string[];
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  inviteUrl: string;
}

interface TenantInfo {
  name: string;
  settings?: {
    branding?: {
      companyName?: string;
    }
  }
}

interface GetInvitationResponse {
  invitation: InvitationData;
  tenant: TenantInfo;
  invitedByUser: {
    name: string;
    email: string;
  };
}

interface AcceptInvitationRequest {
  uid: string;
  email: string;
  name: string;
  timezone?: string;
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

class InvitationsAPI {
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
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[InvitationsAPI] Making request to: ${url}`);
      console.log(`[InvitationsAPI] Method: ${fetchOptions.method || 'GET'}`);
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      console.error(`[InvitationsAPI] Request failed: ${response.status} ${response.statusText}`);
      console.error(`[InvitationsAPI] URL: ${url}`);
      
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get invitation details by invitation ID
   */
  async getInvitation(invitationId: string): Promise<GetInvitationResponse> {
    const response = await this.makeRequest<GetInvitationResponse>(
      `/invitations/${invitationId}`,
      { method: 'GET' }
    );
    return response.data!;
  }

  /**
   * Accept an invitation and create user account
   */
  async acceptInvitation(
    invitationId: string, 
    userData: AcceptInvitationRequest, 
    token: string
  ): Promise<{ success: boolean; user: any }> {
    const response = await this.makeRequest<{ success: boolean; user: any }>(
      `/invitations/${invitationId}/accept`,
      {
        method: 'POST',
        body: JSON.stringify(userData),
        token
      }
    );
    return response.data!;
  }
}

export const invitationsAPI = new InvitationsAPI();

export type {
  InvitationData,
  TenantInfo,
  GetInvitationResponse,
  AcceptInvitationRequest,
  APIResponse
};