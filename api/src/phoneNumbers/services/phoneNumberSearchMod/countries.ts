import twilio from 'twilio';
import { Country } from '../phoneNumberSearch';

class CountriesModule {
  private twilioClient: twilio.Twilio | null = null;

  private getTwilioClient(): twilio.Twilio {
    if (!this.twilioClient) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const apiKeySid = process.env.TWILIO_API_KEY_SID;
      const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

      console.log('Twilio Environment Variables:', {
        accountSid,
        apiKeySid,
        hasApiKeySecret: !!apiKeySecret
      });

      if (!accountSid) {
        throw new Error('TWILIO_ACCOUNT_SID not configured');
      }

      if (apiKeySid && apiKeySecret) {
        // Use API Key authentication
        console.log('Using Twilio API Key authentication');
        this.twilioClient = twilio(apiKeySid, apiKeySecret, { accountSid });
      } else {
        // Fallback to Auth Token if no API Key
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        console.log('Falling back to Auth Token authentication');
        if (!authToken) {
          throw new Error('Either API Key credentials or Auth Token must be configured');
        }
        this.twilioClient = twilio(accountSid, authToken);
      }
    }
    return this.twilioClient;
  }

  async getAvailableCountries(): Promise<Country[]> {
    try {
      const client = this.getTwilioClient();
      const countries = await client.availablePhoneNumbers.list();

      return countries.map(country => ({
        countryCode: country.countryCode,
        country: country.country,
        uri: country.uri,
        beta: country.beta || false,
        subresourceUris: {
          local: country.subresourceUris?.local,
          tollFree: country.subresourceUris?.toll_free,
          mobile: country.subresourceUris?.mobile
        }
      }));
    } catch (error: any) {
      console.error('Error fetching available countries:', error);
      console.error('Twilio error details:', {
        message: error.message,
        code: error.code,
        moreInfo: error.moreInfo,
        status: error.status
      });
      throw new Error(`Failed to fetch available countries from Twilio: ${error.message}`);
    }
  }

  async getCountryDetails(countryCode: string): Promise<Country> {
    try {
      const client = this.getTwilioClient();
      const country = await client.availablePhoneNumbers(countryCode).fetch();

      return {
        countryCode: country.countryCode,
        country: country.country,
        uri: country.uri,
        beta: country.beta || false,
        subresourceUris: {
          local: country.subresourceUris?.local,
          tollFree: country.subresourceUris?.toll_free,
          mobile: country.subresourceUris?.mobile
        }
      };
    } catch (error) {
      console.error(`Error fetching country details for ${countryCode}:`, error);
      throw new Error(`Failed to fetch country details for ${countryCode}`);
    }
  }
}

export const countriesModule = new CountriesModule();