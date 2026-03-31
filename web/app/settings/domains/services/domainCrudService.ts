/**
 * Domain Management API Service
 *
 * Handles all API calls for:
 * - Base domain CRUD operations
 * - Domain verification
 * - Mailgun domain connection management
 */

// ==================== TYPES ====================

export type VerificationMethod = 'dns-txt' | 'manual';
export type VerificationStatus = 'pending' | 'verified' | 'failed';

export interface DomainVerification {
  method: VerificationMethod;
  status: VerificationStatus;
  verificationToken?: string;
  verificationValue?: string;
  verifiedAt?: Date;
  lastCheckedAt?: Date;
  errorMessage?: string;
}

export interface DomainConnections {
  mailgun?: boolean;
}

export interface Domain {
  domainId: string;
  tenantId: string;
  displayName?: string;
  description?: string;
  isPrimary?: boolean;
  verification: DomainVerification;
  connections: DomainConnections;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDomainRequest {
  tenantId: string;
  domainId: string;
  displayName?: string;
  description?: string;
  isPrimary?: boolean;
  verificationMethod?: VerificationMethod;
}

export interface UpdateDomainRequest {
  tenantId: string;
  displayName?: string;
  description?: string;
  isPrimary?: boolean;
}

export interface VerifyDomainRequest {
  tenantId: string;
}

export interface VerifyDomainResponse {
  success: boolean;
  verified: boolean;
  method: string;
  message: string;
  verifiedAt?: Date;
}

// Mailgun Domain Types
export interface MailgunDomain {
  domainId: string;
  state: string;
  status: string;
  smtpLogin?: string;
  sendingDnsRecords: any[];
  receivingDnsRecords: any[];
  verification?: any;
}

export interface ConnectMailgunDomainRequest {
  tenantId: string;
  domainId: string;
}

interface APIResponse<T = any> {
  success: boolean;
  domain?: T;
  domains?: T[];
  data?: T;
  count?: number;
  error?: string;
  message?: string;
}

// ==================== API SERVICE ====================

class DomainCrudService {
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
      console.log(`[DomainAPI] Making request to: ${url}`);
      console.log(`[DomainAPI] Method: ${fetchOptions.method || 'GET'}`);
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      console.error(`[DomainAPI] Request failed: ${response.status} ${response.statusText}`);

      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || errorData.details || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // ==================== BASE DOMAIN CRUD ====================

  /**
   * Get all domains for the tenant
   */
  async getAllDomains(
    tenantId: string,
    token: string,
    filters?: {
      verified?: boolean;
      isPrimary?: boolean;
      hasConnection?: 'mailgun';
    }
  ): Promise<{ domains: Domain[]; count: number }> {
    const params = new URLSearchParams({ tenantId });
    if (filters?.verified !== undefined) params.append('verified', filters.verified.toString());
    if (filters?.isPrimary !== undefined) params.append('isPrimary', filters.isPrimary.toString());
    if (filters?.hasConnection) params.append('hasConnection', filters.hasConnection);

    const queryString = params.toString();
    const endpoint = `/domains${queryString ? `?${queryString}` : ''}`;

    const response = await this.makeRequest<Domain>(endpoint, { token });
    return {
      domains: response.domains || [],
      count: response.count || 0,
    };
  }

  /**
   * Get single domain
   */
  async getDomain(domainId: string, tenantId: string, token: string): Promise<Domain> {
    const response = await this.makeRequest<Domain>(
      `/domains/${domainId}?tenantId=${tenantId}`,
      { token }
    );
    if (!response.domain) {
      throw new Error('Domain not found');
    }
    return response.domain;
  }

  /**
   * Create a new domain
   */
  async createDomain(data: CreateDomainRequest, token: string): Promise<Domain> {
    const response = await this.makeRequest<Domain>(`/domains`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });

    if (!response.domain) {
      throw new Error('Failed to create domain');
    }

    return response.domain;
  }

  /**
   * Update domain metadata
   */
  async updateDomain(
    domainId: string,
    data: UpdateDomainRequest,
    token: string
  ): Promise<void> {
    await this.makeRequest<Domain>(`/domains/${domainId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    });
  }

  /**
   * Delete a domain
   */
  async deleteDomain(domainId: string, tenantId: string, token: string): Promise<void> {
    await this.makeRequest<void>(`/domains/${domainId}`, {
      method: 'DELETE',
      token,
      // tenantId is extracted from JWT by auth middleware, no need to send in body
    });
  }

  /**
   * Verify domain ownership via DNS TXT
   */
  async verifyDomain(
    domainId: string,
    data: VerifyDomainRequest,
    token: string
  ): Promise<VerifyDomainResponse> {
    const response: any = await this.makeRequest<any>(
      `/domains/${domainId}/verify`,
      {
        method: 'POST',
        token,
        // tenantId is extracted from JWT by auth middleware, no need to send in body
      }
    );

    return {
      success: response.success || false,
      verified: response.verified || false,
      method: response.method || 'dns-txt',
      message: response.message || '',
      verifiedAt: response.verifiedAt,
    };
  }

  // ==================== MAILGUN DOMAIN MANAGEMENT ====================

  /**
   * Get all Mailgun domains for the tenant
   */
  async getMailgunDomains(tenantId: string, token: string): Promise<MailgunDomain[]> {
    const response = await this.makeRequest<MailgunDomain>(
      `/mailgun/domains?tenantId=${tenantId}`,
      { token }
    );
    return response.domains || [];
  }

  /**
   * Connect a verified domain to Mailgun
   */
  async connectToMailgun(data: ConnectMailgunDomainRequest, token: string): Promise<MailgunDomain> {
    const response = await this.makeRequest<MailgunDomain>(`/mailgun/domains`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });

    if (!response.domain) {
      throw new Error('Failed to connect domain to Mailgun');
    }

    return response.domain;
  }

  /**
   * Disconnect a domain from Mailgun
   */
  async disconnectFromMailgun(
    domainId: string,
    tenantId: string,
    token: string
  ): Promise<void> {
    await this.makeRequest<void>(`/mailgun/domains/${domainId}`, {
      method: 'DELETE',
      token,
      // tenantId is extracted from JWT by auth middleware, no need to send
    });
  }

  /**
   * Sync Mailgun DNS verification status
   */
  async syncMailgunDomain(domainId: string, tenantId: string, token: string): Promise<MailgunDomain> {
    const response = await this.makeRequest<MailgunDomain>(
      `/mailgun/domains/${domainId}/sync`,
      {
        method: 'POST',
        token,
        // tenantId is extracted from JWT by auth middleware, no need to send in body
      }
    );

    if (!response.domain) {
      throw new Error('Failed to sync Mailgun domain');
    }

    return response.domain;
  }

  async verifyMailgunDomain(domainId: string, tenantId: string, token: string): Promise<any> {
    console.log(`[SERVICE] Verifying Mailgun domain: ${domainId}`);
    const response = await this.makeRequest<any>(
      `/mailgun/domains/${domainId}/verify`,
      {
        method: 'POST',
        token,
        // tenantId is extracted from JWT by auth middleware, no need to send in body
      }
    );

    console.log('[SERVICE] Verification response:', response);
    return response;
  }
}

export const domainCrudService = new DomainCrudService();
