/**
 * Validates and formats phone numbers for SMS OTP
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formattedNumber?: string;
  error?: string;
}

/**
 * Validates and formats a phone number
 * Accepts formats like: +1234567890, (123) 456-7890, 123-456-7890, 1234567890
 * Returns in E.164 format: +1234567890
 */
export const verifyPhoneFormat = (phoneNumber: string): PhoneValidationResult => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      error: 'Phone number is required'
    };
  }

  // Remove all non-numeric characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Handle different input formats
  if (cleaned.startsWith('+')) {
    // Already in international format
    if (cleaned.length < 10 || cleaned.length > 15) {
      return {
        isValid: false,
        error: 'Invalid phone number length'
      };
    }
  } else if (cleaned.length === 10) {
    // US number without country code
    cleaned = '+1' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US number with 1 prefix
    cleaned = '+' + cleaned;
  } else {
    return {
      isValid: false,
      error: 'Invalid phone number format. Please use +1234567890 or (123) 456-7890 format'
    };
  }

  // Additional validation for US numbers (most common case)
  if (cleaned.startsWith('+1') && cleaned.length !== 12) {
    return {
      isValid: false,
      error: 'Invalid US phone number length'
    };
  }

  // Basic pattern validation
  const phonePattern = /^\+\d{10,14}$/;
  if (!phonePattern.test(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid phone number format'
    };
  }

  return {
    isValid: true,
    formattedNumber: cleaned
  };
};

/**
 * Masks a phone number for display purposes
 * +1234567890 -> +1***-***-7890
 */
export const maskPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber || phoneNumber.length < 10) {
    return phoneNumber;
  }

  if (phoneNumber.startsWith('+1') && phoneNumber.length === 12) {
    // US number: +1234567890 -> +1***-***-7890
    const countryCode = phoneNumber.substring(0, 2);
    const lastFour = phoneNumber.substring(8);
    return `${countryCode}***-***-${lastFour}`;
  } else {
    // International number: show first 3 and last 4
    const prefix = phoneNumber.substring(0, 3);
    const suffix = phoneNumber.substring(phoneNumber.length - 4);
    const stars = '*'.repeat(Math.max(3, phoneNumber.length - 7));
    return `${prefix}${stars}${suffix}`;
  }
};