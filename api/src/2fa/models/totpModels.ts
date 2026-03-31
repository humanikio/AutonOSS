export interface TotpEnrollmentParams {
  userId: string;
  tenantId: string;
  userEmail: string;
  appName?: string;
}

export interface TotpEnrollmentResult {
  success: boolean;
  qrCodeDataUrl?: string;
  secret?: string;
  backupCodes?: string[];
  error?: string;
}

export interface TotpVerificationParams {
  userId: string;
  tenantId: string;
  code: string;
  isEnrollment?: boolean;
  isBackupCode?: boolean;
}

export interface TotpVerificationResult {
  success: boolean;
  valid?: boolean;
  backupCodes?: string[];
  error?: string;
}

export interface TotpStatusParams {
  userId: string;
  tenantId: string;
}

export interface TotpStatusResult {
  success: boolean;
  enabled?: boolean;
  enrolledAt?: string;
  backupCodesRemaining?: number;
  error?: string;
}

export interface TotpDisableParams {
  userId: string;
  tenantId: string;
  verificationCode: string;
}

export interface TotpDisableResult {
  success: boolean;
  error?: string;
}

export interface BackupCodesParams {
  userId: string;
  tenantId: string;
  verificationCode?: string;
}

export interface BackupCodesResult {
  success: boolean;
  backupCodes?: string[];
  error?: string;
}

export interface UserSecurityData {
  totp?: {
    enabled: boolean;
    secretEncrypted: string;
    enrolledAt: string;
    lastUsedAt?: string;
    lastTimestamp?: number; // For replay protection
    backupCodes: Array<{
      codeHash: string;
      used: boolean;
      usedAt?: string;
    }>;
  };
  trustedDevices?: Array<{
    deviceId: string;
    name: string;
    trustedAt: string;
    expiresAt: string;
    userAgent?: string;
    ipAddress?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface TotpConfig {
  algorithm: 'SHA1';
  digits: 6;
  period: 30;
  window: 1; // Allow ±30 seconds for clock skew
}

export const TOTP_CONFIG: TotpConfig = {
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  window: 1
};

export const BACKUP_CODES_COUNT = 8;
export const BACKUP_CODE_LENGTH = 8;