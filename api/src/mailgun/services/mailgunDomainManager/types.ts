/**
 * Mailgun Domain Management Types
 *
 * Firestore path: tenants/{tenantId}/mailgun/config/domains/{domainId}
 * where domainId = domain name (e.g., "mybusiness.com")
 */

export interface DnsRecord {
  recordType: 'TXT' | 'CNAME' | 'MX';
  name: string;
  value: string;
  valid: string;
  isActive: boolean;
  cached?: string[];
  priority?: string;
}

// Mailgun API response types
export interface MailgunDnsRecord {
  record_type: string;      // 'TXT', 'MX', 'CNAME'
  valid: string;            // 'valid', 'invalid', 'unknown'
  name: string;             // DNS record name
  value: string;            // DNS record value
  priority?: string;        // For MX records
}

export interface MailgunVerifyDomainResponse {
  message: string;
  domain: {
    name: string;
    state: string;          // 'active', 'unverified', 'disabled'
    created_at: string;
    smtp_password?: string;
    smtp_login?: string;
    type?: string;
    wildcard?: boolean;
  };
  sending_dns_records: MailgunDnsRecord[];
  receiving_dns_records: MailgunDnsRecord[];
}

export interface MailgunDomainVerificationStatus {
  lastVerified: Date;
  allRecordsValid: boolean;
  sendingRecordsValid: boolean;
  receivingRecordsValid: boolean;
  sendingRecords: MailgunDnsRecord[];
  receivingRecords: MailgunDnsRecord[];
  state: string;             // Mailgun domain state
}

export interface MailgunDomain {
  // Firestore metadata
  domainId: string;               // Domain name (e.g., "mybusiness.com")
  tenantId: string;

  // Mailgun API data
  mailgunDomainId?: string;       // Mailgun's internal ID
  state: 'unverified' | 'active' | 'disabled';
  type: 'custom' | 'sandbox';

  // SMTP credentials
  smtpLogin: string;              // postmaster@domain.com
  smtpPassword?: string;

  // DNS records
  sendingDnsRecords: DnsRecord[];
  receivingDnsRecords: DnsRecord[];

  // Settings
  spamAction: 'disabled' | 'tag' | 'block';
  requireTls: boolean;
  skipVerification: boolean;
  wildcard: boolean;
  useAutomaticSenderSecurity: boolean;
  webScheme: 'http' | 'https';
  webPrefix: string;

  // Status tracking
  status: 'pending' | 'verifying' | 'active' | 'failed' | 'disabled';
  verifiedAt?: Date;
  lastSyncedAt?: Date;
  errorMessage?: string;

  // Verification status
  verification?: MailgunDomainVerificationStatus;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDomainData {
  tenantId: string;
  domainId: string;               // Domain name
  smtpPassword?: string;
  spamAction?: 'disabled' | 'tag' | 'block';
  wildcard?: boolean;
  useAutomaticSenderSecurity?: boolean;
  requireTls?: boolean;
  webScheme?: 'http' | 'https';
}

export interface UpdateDomainData {
  smtpPassword?: string;
  spamAction?: 'disabled' | 'tag' | 'block';
  wildcard?: boolean;
  requireTls?: boolean;
  skipVerification?: boolean;
  webScheme?: 'http' | 'https';
  webPrefix?: string;
  status?: 'pending' | 'verifying' | 'active' | 'failed' | 'disabled';
  errorMessage?: string;
}
