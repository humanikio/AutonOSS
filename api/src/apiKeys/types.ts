/**
 * TypeScript types for API Key system
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Root collection mapping document
 * Stored at: /autonApiKeys/{accessKeyId}
 * Purpose: Fast direct lookups by access key ID
 */
export interface ApiKeyMapping {
  id: string;               // Same as accessKeyId
  encryptedSecret: string;  // Encrypted API secret for validation
  tenantId: string;         // Owner tenant
  active: boolean;          // Can revoke without deleting
  createdAt: Timestamp;
  lastUsedAt: Timestamp | null;
  usageCount: number;       // Total API calls made
}

/**
 * Full API key document
 * Stored at: /tenants/{tenantId}/autonApiKeys/{accessKeyId}
 * Purpose: Store encrypted secrets and full metadata
 */
export interface ApiKey {
  id: string;               // Access Key ID (e.g., plkey_abc123...)
  name: string;             // User-friendly name
  secretLastFour: string;   // Last 4 chars of secret for UI
  encryptedSecret: string;  // AES-256 encrypted API secret
  environment: 'live' | 'test';
  active: boolean;
  isAccountKey: boolean;    // True if this is the account service key
  scopes: string[];         // Future: permissions
  createdAt: Timestamp;
  createdBy: string;        // User ID who created it
  lastUsedAt: Timestamp | null;
  usageCount: number;
  expiresAt: Timestamp | null;
  metadata: Record<string, any>;
}

/**
 * Main settings document for tenant API keys
 * Stored at: /tenants/{tenantId}/autonApiKeys/main
 */
export interface TenantApiKeySettings {
  activeAccountApiKeyId: string;  // Access Key ID of the active account key
  updatedAt: Timestamp;
}

/**
 * Request body for creating a new API key
 */
export interface CreateApiKeyRequest {
  name: string;
  environment?: 'live' | 'test';
  scopes?: string[];
  expiresAt?: Date;
  isAccountKey?: boolean;  // Mark as account service key
}

/**
 * Response when creating a new API key
 * Note: fullKey is ONLY returned at creation time
 */
export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  accessKeyId: string;  // For display (also in apiKey.id)
  apiSecret: string;    // ONLY shown once!
  fullKey: string;      // accessKeyId.apiSecret format
}

/**
 * Sanitized API key for listing (excludes encrypted secret)
 */
export interface ListApiKeysResponse {
  id: string;               // Access Key ID
  name: string;
  secretLastFour: string;   // Last 4 of secret
  environment: 'live' | 'test';
  active: boolean;
  isAccountKey: boolean;    // Show if this is the account key
  createdAt: Timestamp;
  lastUsedAt: Timestamp | null;
  usageCount: number;
  // Note: encryptedSecret is NOT included
}

/**
 * Request body for updating an API key
 */
export interface UpdateApiKeyRequest {
  name?: string;
  active?: boolean;
  scopes?: string[];
}

/**
 * Result of API key validation
 */
export interface ValidateApiKeyResult {
  valid: boolean;
  tenantId?: string;
  apiKeyId?: string;
}
