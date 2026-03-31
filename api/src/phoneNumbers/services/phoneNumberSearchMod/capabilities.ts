import twilio from 'twilio';

interface NumberCapabilities {
  countryCode: string;
  supportsSms: boolean;
  supportsVoice: boolean;
  supportsMms: boolean;
  supportsFax: boolean;
  numberTypes: string[];
  addressRequirements: {
    local: boolean;
    foreign: boolean;
    any: boolean;
  };
}

class CapabilitiesModule {
  private twilioClient: twilio.Twilio | null = null;

  private getTwilioClient(): twilio.Twilio {
    if (!this.twilioClient) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const apiKeySid = process.env.TWILIO_API_KEY_SID;
      const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

      if (!accountSid) {
        throw new Error('TWILIO_ACCOUNT_SID not configured');
      }

      if (apiKeySid && apiKeySecret) {
        // Use API Key authentication
        this.twilioClient = twilio(apiKeySid, apiKeySecret, { accountSid });
      } else {
        // Fallback to Auth Token if no API Key
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!authToken) {
          throw new Error('Either API Key credentials or Auth Token must be configured');
        }
        this.twilioClient = twilio(accountSid, authToken);
      }
    }
    return this.twilioClient;
  }

  async getCapabilitiesForCountry(countryCode: string): Promise<NumberCapabilities> {
    try {
      const client = this.getTwilioClient();
      const country = await client.availablePhoneNumbers(countryCode).fetch();

      // Determine available number types
      const numberTypes: string[] = [];
      if (country.subresourceUris?.local) numberTypes.push('local');
      if (country.subresourceUris?.toll_free) numberTypes.push('tollFree');
      if (country.subresourceUris?.mobile) numberTypes.push('mobile');

      // Get sample numbers to check capabilities
      let sampleCapabilities = {
        sms: false,
        voice: false,
        mms: false,
        fax: false
      };

      // Try to get a sample local number to check capabilities
      try {
        const localNumbers = await client.availablePhoneNumbers(countryCode)
          .local
          .list({ limit: 1 });

        if (localNumbers.length > 0) {
          const sample = localNumbers[0];
          sampleCapabilities = {
            sms: sample.capabilities?.sms || false,
            voice: sample.capabilities?.voice || false,
            mms: sample.capabilities?.mms || false,
            fax: sample.capabilities?.fax || false
          };
        }
      } catch (error) {
        console.log(`No local numbers available for ${countryCode}`);
      }

      return {
        countryCode,
        supportsSms: sampleCapabilities.sms,
        supportsVoice: sampleCapabilities.voice,
        supportsMms: sampleCapabilities.mms,
        supportsFax: sampleCapabilities.fax,
        numberTypes,
        addressRequirements: {
          local: true, // This would need to be determined by the specific country
          foreign: false,
          any: false
        }
      };
    } catch (error) {
      console.error(`Error fetching capabilities for ${countryCode}:`, error);
      throw new Error(`Failed to fetch capabilities for ${countryCode}`);
    }
  }

  async getCapabilitiesByNumberType(countryCode: string, numberType: 'local' | 'tollFree' | 'mobile'): Promise<any> {
    try {
      const client = this.getTwilioClient();
      const countryNumbers = client.availablePhoneNumbers(countryCode);
      
      let numbers;
      switch (numberType) {
        case 'local':
          numbers = await countryNumbers.local.list({ limit: 1 });
          break;
        case 'tollFree':
          numbers = await countryNumbers.tollFree.list({ limit: 1 });
          break;
        case 'mobile':
          numbers = await countryNumbers.mobile.list({ limit: 1 });
          break;
      }

      if (numbers && numbers.length > 0) {
        return {
          numberType,
          capabilities: numbers[0].capabilities,
          addressRequirements: numbers[0].addressRequirements
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching capabilities for ${numberType} in ${countryCode}:`, error);
      return null;
    }
  }
}

export const capabilitiesModule = new CapabilitiesModule();