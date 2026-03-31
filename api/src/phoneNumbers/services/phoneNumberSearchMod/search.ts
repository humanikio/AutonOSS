import twilio from 'twilio';
import { SearchParams, AvailableNumber } from '../phoneNumberSearch';

class SearchModule {
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

  async searchAvailableNumbers(params: SearchParams): Promise<AvailableNumber[]> {
    try {
      const client = this.getTwilioClient();
      
      // Build search options based on parameters
      const searchOptions: any = {
        limit: params.limit || 20
      };

      // Add optional search parameters
      if (params.areaCode) searchOptions.areaCode = params.areaCode;
      if (params.contains) searchOptions.contains = params.contains;
      if (params.inRegion) searchOptions.inRegion = params.inRegion;
      if (params.inLocality) searchOptions.inLocality = params.inLocality;
      if (params.excludeAllAddressRequired !== undefined) {
        searchOptions.excludeAllAddressRequired = params.excludeAllAddressRequired;
      }
      if (params.excludeLocalAddressRequired !== undefined) {
        searchOptions.excludeLocalAddressRequired = params.excludeLocalAddressRequired;
      }
      if (params.excludeForeignAddressRequired !== undefined) {
        searchOptions.excludeForeignAddressRequired = params.excludeForeignAddressRequired;
      }
      if (params.beta !== undefined) searchOptions.beta = params.beta;

      // Add capability filters - Twilio API expects these exact parameter names
      if (params.voiceEnabled !== undefined) searchOptions.voiceEnabled = params.voiceEnabled;
      if (params.smsEnabled !== undefined) searchOptions.smsEnabled = params.smsEnabled;
      if (params.mmsEnabled !== undefined) searchOptions.mmsEnabled = params.mmsEnabled;
      if (params.faxEnabled !== undefined) searchOptions.faxEnabled = params.faxEnabled;

      console.log('Search options being sent to Twilio:', searchOptions);

      // Search based on number type
      let numbers;
      const countryNumbers = client.availablePhoneNumbers(params.countryCode);

      switch (params.numberType) {
        case 'local':
          numbers = await countryNumbers.local.list(searchOptions);
          break;
        case 'tollFree':
          numbers = await countryNumbers.tollFree.list(searchOptions);
          break;
        case 'mobile':
          numbers = await countryNumbers.mobile.list(searchOptions);
          break;
        default:
          throw new Error(`Invalid number type: ${params.numberType}`);
      }

      // Log raw Twilio response for debugging
      console.log('Raw Twilio search results count:', numbers.length);
      if (numbers.length > 0) {
        console.log('First Twilio result raw:', JSON.stringify(numbers[0], null, 2));
        console.log('First Twilio result capabilities:', numbers[0].capabilities);
      }

      // Map Twilio response to our interface
      const mappedResults = numbers.map(number => {
        const mapped = {
          phoneNumber: number.phoneNumber,
          friendlyName: number.friendlyName,
          locality: number.locality,
          region: number.region,
          postalCode: number.postalCode,
          isoCountry: number.isoCountry,
          addressRequirements: number.addressRequirements,
          beta: number.beta || false,
          capabilities: {
            voice: number.capabilities?.voice || false,
            sms: (number.capabilities as any)?.SMS || number.capabilities?.sms || false,  // Handle both cases
            mms: (number.capabilities as any)?.MMS || number.capabilities?.mms || false,  // Handle both cases
            fax: number.capabilities?.fax || false
          }
        };
        
        console.log(`Mapping ${number.phoneNumber}:`, {
          raw: number.capabilities,
          mapped: mapped.capabilities
        });
        
        return mapped;
      });

      console.log('Final mapped results count:', mappedResults.length);
      return mappedResults;
    } catch (error) {
      console.error('Error searching available numbers:', error);
      throw new Error('Failed to search available numbers from Twilio');
    }
  }

  async searchByPattern(countryCode: string, pattern: string, numberType: string = 'local'): Promise<AvailableNumber[]> {
    return this.searchAvailableNumbers({
      countryCode,
      numberType: numberType as 'local' | 'tollFree' | 'mobile',
      contains: pattern,
      limit: 50
    });
  }

  async searchByLocation(countryCode: string, state?: string, city?: string): Promise<AvailableNumber[]> {
    return this.searchAvailableNumbers({
      countryCode,
      numberType: 'local',
      inRegion: state,
      inLocality: city,
      limit: 50
    });
  }
}

export const searchModule = new SearchModule();