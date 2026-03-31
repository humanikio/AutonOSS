import { randomBytes } from 'crypto';

export class GenerateDestinationKey {
  /**
   * Generate a unique destination key for a given category
   */
  generate(category: 'sms' | 'email' | 'phone'): string {
    // Generate random bytes and convert to hex
    const randomPart = randomBytes(8).toString('hex');
    
    // Create timestamp
    const timestamp = Date.now().toString(36);
    
    // Create category prefix
    const categoryPrefix = category.toUpperCase();
    
    // Combine parts: CATEGORY_TIMESTAMP_RANDOM
    const destinationKey = `${categoryPrefix}_${timestamp}_${randomPart}`;
    
    console.log(`Generated destination key: ${destinationKey}`);
    
    return destinationKey;
  }
  
  /**
   * Validate destination key format
   */
  validate(destinationKey: string): boolean {
    // Expected format: CATEGORY_TIMESTAMP_RANDOM
    const pattern = /^(SMS|EMAIL|PHONE)_[a-z0-9]+_[a-f0-9]{16}$/;
    return pattern.test(destinationKey);
  }
  
  /**
   * Extract category from destination key
   */
  extractCategory(destinationKey: string): 'sms' | 'email' | 'phone' | null {
    if (!this.validate(destinationKey)) {
      return null;
    }
    
    const parts = destinationKey.split('_');
    const categoryPart = parts[0];
    
    switch (categoryPart) {
      case 'SMS':
        return 'sms';
      case 'EMAIL':
        return 'email';
      case 'PHONE':
        return 'phone';
      default:
        return null;
    }
  }
  
  /**
   * Extract timestamp from destination key
   */
  extractTimestamp(destinationKey: string): Date | null {
    if (!this.validate(destinationKey)) {
      return null;
    }
    
    try {
      const parts = destinationKey.split('_');
      const timestampPart = parts[1];
      
      // Convert from base36 back to number
      const timestamp = parseInt(timestampPart, 36);
      
      return new Date(timestamp);
    } catch (error) {
      console.error('Error extracting timestamp from destination key:', error);
      return null;
    }
  }
}

export const generateDestinationKey = new GenerateDestinationKey();