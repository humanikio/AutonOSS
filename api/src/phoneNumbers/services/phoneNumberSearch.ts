import { countriesModule } from './phoneNumberSearchMod/countries';
import { searchModule } from './phoneNumberSearchMod/search';
import { capabilitiesModule } from './phoneNumberSearchMod/capabilities';
import { areaCodesModule } from './phoneNumberSearchMod/areaCodes';

export interface SearchParams {
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

export interface AvailableNumber {
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

class PhoneNumberSearchService {
  async searchNumbers(params: SearchParams): Promise<AvailableNumber[]> {
    return searchModule.searchAvailableNumbers(params);
  }

  async getAvailableCountries(): Promise<Country[]> {
    return countriesModule.getAvailableCountries();
  }

  async getNumberCapabilities(countryCode: string): Promise<any> {
    return capabilitiesModule.getCapabilitiesForCountry(countryCode);
  }

  async getAreaCodes(countryCode: string, state?: string): Promise<any[]> {
    return areaCodesModule.getAreaCodes(countryCode, state);
  }
}

export const phoneNumberSearchService = new PhoneNumberSearchService();