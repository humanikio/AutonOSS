export interface SmsOtpSetupParams {
  userId: string;
  tenantId: string;
  phoneNumber: string;
}

export interface SmsOtpSetupResult {
  success: boolean;
  testCodeSent?: boolean;
  error?: string;
}

export interface SmsOtpVerifyTestParams {
  userId: string;
  tenantId: string;
  phoneNumber: string;
  testCode: string;
}

export interface SmsOtpVerifyTestResult {
  success: boolean;
  verified?: boolean;
  error?: string;
}

export interface SmsOtpSendParams {
  userId: string;
  tenantId: string;
  phoneNumber?: string; // Optional, will use stored number if not provided
}

export interface SmsOtpSendResult {
  success: boolean;
  codeSent?: boolean;
  error?: string;
}

export interface SmsOtpVerifyParams {
  userId: string;
  tenantId: string;
  code: string;
}

export interface SmsOtpVerifyResult {
  success: boolean;
  valid?: boolean;
  error?: string;
}

export interface SmsOtpStatusParams {
  userId: string;
  tenantId: string;
}

export interface SmsOtpStatusResult {
  success: boolean;
  enabled: boolean;
  phoneNumber?: string | null; // Masked version like +1***-***-1234
  enrolledAt?: string | null;
  error?: string;
}

export interface SmsOtpDisableParams {
  userId: string;
  tenantId: string;
  verificationCode: string;
}

export interface SmsOtpDisableResult {
  success: boolean;
  error?: string;
}

export interface SmsOtpData {
  enabled: boolean;
  phoneNumber: string; // Encrypted
  enrolledAt: string;
  lastCodeSentAt?: string;
  lastUsedAt?: string;
  testCodes?: Array<{
    code: string;
    expiresAt: string;
    used: boolean;
  }>;
  activeCodes?: Array<{
    codeHash: string;
    expiresAt: string;
    used: boolean;
    usedAt?: string;
  }>;
}

export interface UserSecurityDataWithSms {
  totp?: {
    enabled: boolean;
    secretEncrypted: string;
    enrolledAt: string;
    lastUsedAt?: string;
    lastTimestamp?: number;
    backupCodes: Array<{
      codeHash: string;
      used: boolean;
      usedAt?: string;
    }>;
  };
  smsOtp?: SmsOtpData;
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

export interface SmsOtpConfig {
  codeLength: 6;
  expiryMinutes: 5; // OTP codes expire in 5 minutes
  maxAttempts: 3; // Max verification attempts per code
  cooldownMinutes: 1; // Cooldown between sending codes
}

export const SMS_OTP_CONFIG: SmsOtpConfig = {
  codeLength: 6,
  expiryMinutes: 5,
  maxAttempts: 3,
  cooldownMinutes: 1
};