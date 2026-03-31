import { getAuthHeaders } from '@/lib/auth';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api';

export interface PhoneNumberSearchParams {
  countryCode: string;
  numberType: 'local' | 'tollFree' | 'mobile';
  areaCode?: string;
  contains?: string;
  inRegion?: string;
  inLocality?: string;
  limit?: number;
  excludeAllAddressRequired?: boolean;
  excludeLocalAddressRequired?: boolean;
  excludeForeignAddressRequired?: boolean;
  beta?: boolean;
  // Capability filters
  voiceEnabled?: boolean;
  smsEnabled?: boolean;
  mmsEnabled?: boolean;
  faxEnabled?: boolean;
}

export interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  isoCountry: string;
  addressRequirements: string;
  beta: boolean;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
    fax: boolean;
  };
}

export interface Country {
  countryCode: string;
  country: string;
  uri: string;
  beta: boolean;
  subresourceUris: {
    local?: string;
    tollFree?: string;
    mobile?: string;
  };
}

export interface AreaCode {
  areaCode: string;
  region: string;
  locality?: string[];
}

class PhoneNumberService {
  async searchAvailableNumbers(params: PhoneNumberSearchParams): Promise<AvailablePhoneNumber[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/phone-numbers/search`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to search phone numbers');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error searching phone numbers:', error);
      throw error;
    }
  }

  async getAvailableCountries(): Promise<Country[]> {
    try {
      const headers = await getAuthHeaders();
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Request headers:', headers);
      
      const response = await fetch(`${API_BASE_URL}/phone-numbers/countries`, {
        method: 'GET',
        headers,
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let errorMessage = 'Failed to fetch countries';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          // If not JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(`${response.status}: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('Countries data:', data);
      return data.data;
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw error;
    }
  }

  async getNumberCapabilities(countryCode: string): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/phone-numbers/capabilities/${countryCode}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch capabilities');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching capabilities:', error);
      throw error;
    }
  }

  async getAreaCodes(countryCode: string, state?: string): Promise<AreaCode[]> {
    try {
      const headers = await getAuthHeaders();
      const url = new URL(`${API_BASE_URL}/phone-numbers/area-codes/${countryCode}`);
      if (state) {
        url.searchParams.append('state', state);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch area codes');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching area codes:', error);
      throw error;
    }
  }

  async getPhoneNumberPricing(phoneNumber: string, numberType: string, countryCode: string): Promise<{
    phoneNumber: string;
    numberType: string;
    countryCode: string;
    pricing: {
      setupFee: number;
      monthlyFee: number;
      currency: string;
      total: number;
    };
  }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/phone-numbers/pricing`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          numberType,
          countryCode
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pricing error response:', errorText);
        let errorMessage = 'Failed to get pricing';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(`${response.status}: ${errorMessage}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting pricing:', error);
      throw error;
    }
  }

  async initiatePurchase(phoneNumber: string, numberType: string, countryCode: string, friendlyName?: string): Promise<{
    sessionId: string;
    checkoutUrl: string;
    priceDetails: {
      setupFee: number;
      monthlyFee: number;
      currency: string;
      total: number;
    };
  }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/phone-numbers/purchase`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          numberType,
          countryCode,
          friendlyName
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Purchase error response:', errorText);
        let errorMessage = 'Failed to initiate purchase';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(`${response.status}: ${errorMessage}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error initiating purchase:', error);
      throw error;
    }
  }

  async getPurchasedNumbers(): Promise<{
    phoneNumber: string;
    twilioSid: string;
    friendlyName: string;
    numberType: string;
    countryCode: string;
    capabilities: {
      voice: boolean;
      sms: boolean;
      mms: boolean;
      fax: boolean;
    };
    status: string;
    purchasedAt: string;
    createdAt: string;
  }[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/phone-numbers/purchased`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Get purchased numbers error response:', errorText);
        let errorMessage = 'Failed to fetch purchased numbers';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(`${response.status}: ${errorMessage}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching purchased numbers:', error);
      throw error;
    }
  }
}

export const phoneNumberService = new PhoneNumberService();