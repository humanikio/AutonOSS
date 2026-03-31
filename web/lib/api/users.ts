interface TeamUser {
  uid: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'user';
  tenantId: string;
  accessibleTenants: string[];
  createdAt: string;
  lastLoginAt?: string;
  status: 'active' | 'suspended';
  avatarUrl?: string;
}

interface SubAccount {
  subTenantId: string;
  name: string;
  description?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  createdBy: string;
  allowedUsers: string[];
  userCount: number;
}

interface InviteUserRequest {
  email: string;
  name: string;
  role: 'admin' | 'user';
  subAccounts?: string[];
  hasMainAccountAccess?: boolean;  // NEW: Control access to main tenant account
}

interface CreateSubaccountRequest {
  name: string;
  description?: string;
}

interface UpdateUserStatusRequest {
  status: 'active' | 'suspended';
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

class UsersAPI {
  private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  private get apiURL() {
    const base = this.baseURL.replace('/api', ''); // Remove any trailing /api
    return `${base}/api`; // Always append /api
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
      console.log(`[UsersAPI] Making request to: ${url}`);
      console.log(`[UsersAPI] Method: ${fetchOptions.method || 'GET'}`);
      console.log(`[UsersAPI] Headers:`, headers);
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      console.error(`[UsersAPI] Request failed: ${response.status} ${response.statusText}`);
      console.error(`[UsersAPI] URL: ${url}`);
      
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all team members for a tenant
   */
  async getTeamUsers(tenantId: string, token: string): Promise<{ users: TeamUser[]; totalCount: number }> {
    const response = await this.makeRequest<{ users: TeamUser[]; totalCount: number }>(
      `/users/${tenantId}/team`,
      { method: 'GET', token }
    );
    return response.data!;
  }

  /**
   * Get all subaccounts for a tenant
   */
  async getSubaccounts(tenantId: string, token: string): Promise<{ subaccounts: SubAccount[]; totalCount: number }> {
    const response = await this.makeRequest<{ subaccounts: SubAccount[]; totalCount: number }>(
      `/users/${tenantId}/subaccounts`,
      { method: 'GET', token }
    );
    return response.data!;
  }

  /**
   * Invite a new user to join the team
   */
  async inviteUser(
    tenantId: string, 
    inviteData: InviteUserRequest, 
    token: string
  ): Promise<{ invitationId: string; email: string; status: string }> {
    const response = await this.makeRequest<{ invitationId: string; email: string; status: string }>(
      `/users/${tenantId}/invite`,
      {
        method: 'POST',
        body: JSON.stringify(inviteData),
        token
      }
    );
    return response.data!;
  }

  /**
   * Create a new subaccount
   */
  async createSubaccount(
    tenantId: string, 
    subaccountData: CreateSubaccountRequest, 
    token: string
  ): Promise<{ subTenantId: string; name: string; status: string; createdAt: string }> {
    const response = await this.makeRequest<{ subTenantId: string; name: string; status: string; createdAt: string }>(
      `/users/${tenantId}/subaccounts`,
      {
        method: 'POST',
        body: JSON.stringify(subaccountData),
        token
      }
    );
    return response.data!;
  }

  /**
   * Update user status (active/suspended)
   */
  async updateUserStatus(
    tenantId: string, 
    userId: string, 
    statusData: UpdateUserStatusRequest, 
    token: string
  ): Promise<{ userId: string; status: string; updatedAt: string }> {
    const response = await this.makeRequest<{ userId: string; status: string; updatedAt: string }>(
      `/users/${tenantId}/${userId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify(statusData),
        token
      }
    );
    return response.data!;
  }

  /**
   * Remove user from team
   */
  async removeUser(tenantId: string, userId: string, token: string): Promise<{ userId: string; removed: boolean }> {
    const response = await this.makeRequest<{ userId: string; removed: boolean }>(
      `/users/${tenantId}/${userId}`,
      { method: 'DELETE', token }
    );
    return response.data!;
  }

  /**
   * Update user role and permissions
   */
  async updateUserRole(
    tenantId: string, 
    userId: string, 
    roleData: { role: 'admin' | 'user'; subAccounts?: string[]; hasMainAccountAccess?: boolean }, 
    token: string
  ): Promise<{ userId: string; role: string; accessibleTenants: string[] }> {
    const response = await this.makeRequest<{ userId: string; role: string; accessibleTenants: string[] }>(
      `/users/${tenantId}/${userId}/role`,
      {
        method: 'PUT',
        body: JSON.stringify(roleData),
        token
      }
    );
    return response.data!;
  }

  /**
   * Update subaccount details
   */
  async updateSubaccount(
    tenantId: string, 
    subAccountId: string, 
    updateData: { name?: string; description?: string; status?: 'active' | 'suspended' }, 
    token: string
  ): Promise<{ subTenantId: string; name: string; status: string; updatedAt: string }> {
    const response = await this.makeRequest<{ subTenantId: string; name: string; status: string; updatedAt: string }>(
      `/users/${tenantId}/subaccounts/${subAccountId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updateData),
        token
      }
    );
    return response.data!;
  }

  /**
   * Delete a subaccount
   */
  async deleteSubaccount(tenantId: string, subAccountId: string, token: string): Promise<{ subTenantId: string; deleted: boolean }> {
    const response = await this.makeRequest<{ subTenantId: string; deleted: boolean }>(
      `/users/${tenantId}/subaccounts/${subAccountId}`,
      { method: 'DELETE', token }
    );
    return response.data!;
  }

  /**
   * Grant user access to subaccounts
   */
  async grantSubaccountAccess(
    tenantId: string, 
    userId: string, 
    subAccountIds: string[], 
    token: string
  ): Promise<{ userId: string; grantedSubaccounts: string[]; totalAccessibleTenants: number }> {
    const response = await this.makeRequest<{ userId: string; grantedSubaccounts: string[]; totalAccessibleTenants: number }>(
      `/users/${tenantId}/${userId}/subaccounts`,
      {
        method: 'POST',
        body: JSON.stringify({ subAccountIds }),
        token
      }
    );
    return response.data!;
  }

  /**
   * Revoke user access from specific subaccount
   */
  async revokeSubaccountAccess(
    tenantId: string, 
    userId: string, 
    subAccountId: string, 
    token: string
  ): Promise<{ success: boolean }> {
    const response = await this.makeRequest<{ success: boolean }>(
      `/users/${tenantId}/${userId}/subaccounts/${subAccountId}`,
      { method: 'DELETE', token }
    );
    return response.data!;
  }
}

export const usersAPI = new UsersAPI();

export type {
  TeamUser,
  SubAccount,
  InviteUserRequest,
  CreateSubaccountRequest,
  UpdateUserStatusRequest,
  APIResponse
};