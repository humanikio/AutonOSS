/**
 * Base Domain Management Types
 *
 * Firestore path: tenants/{tenantId}/domains/{domainId}
 * where domainId = domain name (e.g., "mybusiness.com")
 *
 * This is the universal domain layer that tracks domain ownership and connections
 * to various services (Mailgun, Vercel, etc.)
 */

export interface DomainVerification {
  method: 'dns-txt' | 'manual';
  status: 'pending' | 'verified' | 'failed';
  verifiedAt?: Date;
  verificationToken?: string;      // Random token for DNS TXT verification
  verificationValue?: string;       // Expected TXT value (e.g., "auton-verify=abc123")
  lastCheckedAt?: Date;
  errorMessage?: string;
}

export interface DomainConnections {
  mailgun?: boolean;                // Connected to Mailgun for email
  // Future: vercel, cloudflare, aws, etc.
}

export interface Domain {
  // Core identifiers
  domainId: string;                 // Domain name (e.g., "mybusiness.com")
  tenantId: string;

  // Verification
  verification: DomainVerification;

  // Service connections
  connections: DomainConnections;

  // DNS information
  dnsProvider?: string;             // Detected DNS provider (e.g., "Cloudflare", "GoDaddy")

  // Metadata
  displayName?: string;             // Friendly name for the domain
  description?: string;             // Optional description
  isPrimary?: boolean;              // Is this the tenant's primary domain?

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDomainData {
  tenantId: string;
  domainId: string;                 // Domain name
  displayName?: string;
  description?: string;
  isPrimary?: boolean;
  verificationMethod?: 'dns-txt' | 'manual';  // Defaults to 'dns-txt'
}

export interface UpdateDomainData {
  displayName?: string;
  description?: string;
  isPrimary?: boolean;
  verification?: Partial<DomainVerification>;
  connections?: Partial<DomainConnections>;
  dnsProvider?: string;
}

export interface VerifyDomainResult {
  success: boolean;
  verified: boolean;
  method: string;
  message: string;
  verifiedAt?: Date;
  dnsProvider?: string;
}
