import crypto from 'crypto';
import { SMS_OTP_CONFIG } from '../models/smsOtpModels';

/**
 * Generates a random numeric OTP code
 */
export const generateOtpCode = (): string => {
  const codeLength = SMS_OTP_CONFIG.codeLength;
  
  // Generate random bytes and convert to numeric string
  let code = '';
  for (let i = 0; i < codeLength; i++) {
    const randomByte = crypto.randomBytes(1)[0];
    const digit = randomByte % 10;
    code += digit.toString();
  }
  
  return code;
};

/**
 * Hashes an OTP code for secure storage
 */
export const hashOtpCode = (code: string): string => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

/**
 * Verifies an OTP code against its hash
 */
export const verifyOtpCode = (code: string, hash: string): boolean => {
  const codeHash = hashOtpCode(code);
  return codeHash === hash;
};