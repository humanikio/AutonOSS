export interface EmailAccount {
  id: string;
  email: string;
  name: string;
  provider: 'gmail' | 'outlook' | 'mailgun' | 'customMailgun';
  tenantId: string;
  domainId?: string; // For customMailgun - links to verified custom domain
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date | null;
  status: 'active' | 'inactive' | 'pending' | 'error';
  connectedAt: Date;
  updatedAt?: Date;
  lastSync?: Date;
  syncEnabled: boolean;
  foldersSynced: number;
  messagesCount: number;
}

export interface EmailConfig {
  defaultAccountId?: string;
  preferredProvider?: 'gmail' | 'outlook' | 'mailgun' | 'customMailgun';
  enableAutoFallback?: boolean;
  fallbackOrder?: Array<'gmail' | 'outlook' | 'mailgun' | 'customMailgun'>;
  dailySendLimit?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateAccountData {
  id: string;
  email: string;
  name: string;
  provider: 'gmail' | 'outlook' | 'mailgun' | 'customMailgun';
  tenantId: string;
  domainId?: string; // For customMailgun - links to verified custom domain
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date | null;
  status: 'active' | 'inactive' | 'pending' | 'error';
  connectedAt: Date;
  syncEnabled?: boolean;
  foldersSynced?: number;
  messagesCount?: number;
}
