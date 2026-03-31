import twilio from 'twilio';

interface AreaCode {
  areaCode: string;
  region: string;
  locality?: string[];
}

class AreaCodesModule {
  private twilioClient: twilio.Twilio | null = null;
  
  // Static area code data for US states (can be expanded)
  private static US_AREA_CODES: Record<string, AreaCode[]> = {
    'CA': [
      { areaCode: '213', region: 'California', locality: ['Los Angeles'] },
      { areaCode: '310', region: 'California', locality: ['Los Angeles'] },
      { areaCode: '323', region: 'California', locality: ['Los Angeles'] },
      { areaCode: '408', region: 'California', locality: ['San Jose'] },
      { areaCode: '415', region: 'California', locality: ['San Francisco'] },
      { areaCode: '510', region: 'California', locality: ['Oakland'] },
      { areaCode: '619', region: 'California', locality: ['San Diego'] },
      { areaCode: '626', region: 'California', locality: ['Pasadena'] },
      { areaCode: '650', region: 'California', locality: ['San Mateo'] },
      { areaCode: '714', region: 'California', locality: ['Orange County'] },
      { areaCode: '818', region: 'California', locality: ['San Fernando Valley'] },
      { areaCode: '909', region: 'California', locality: ['San Bernardino'] },
      { areaCode: '916', region: 'California', locality: ['Sacramento'] },
      { areaCode: '925', region: 'California', locality: ['Contra Costa'] },
      { areaCode: '949', region: 'California', locality: ['Irvine'] }
    ],
    'NY': [
      { areaCode: '212', region: 'New York', locality: ['Manhattan'] },
      { areaCode: '315', region: 'New York', locality: ['Syracuse'] },
      { areaCode: '347', region: 'New York', locality: ['Brooklyn', 'Queens'] },
      { areaCode: '516', region: 'New York', locality: ['Long Island'] },
      { areaCode: '518', region: 'New York', locality: ['Albany'] },
      { areaCode: '585', region: 'New York', locality: ['Rochester'] },
      { areaCode: '607', region: 'New York', locality: ['Binghamton'] },
      { areaCode: '631', region: 'New York', locality: ['Suffolk County'] },
      { areaCode: '646', region: 'New York', locality: ['Manhattan'] },
      { areaCode: '716', region: 'New York', locality: ['Buffalo'] },
      { areaCode: '718', region: 'New York', locality: ['Brooklyn', 'Queens'] },
      { areaCode: '845', region: 'New York', locality: ['Hudson Valley'] },
      { areaCode: '914', region: 'New York', locality: ['Westchester'] },
      { areaCode: '917', region: 'New York', locality: ['New York City'] }
    ],
    'TX': [
      { areaCode: '214', region: 'Texas', locality: ['Dallas'] },
      { areaCode: '254', region: 'Texas', locality: ['Waco'] },
      { areaCode: '281', region: 'Texas', locality: ['Houston'] },
      { areaCode: '361', region: 'Texas', locality: ['Corpus Christi'] },
      { areaCode: '409', region: 'Texas', locality: ['Beaumont'] },
      { areaCode: '430', region: 'Texas', locality: ['Northeast Texas'] },
      { areaCode: '432', region: 'Texas', locality: ['Midland'] },
      { areaCode: '469', region: 'Texas', locality: ['Dallas'] },
      { areaCode: '512', region: 'Texas', locality: ['Austin'] },
      { areaCode: '682', region: 'Texas', locality: ['Fort Worth'] },
      { areaCode: '713', region: 'Texas', locality: ['Houston'] },
      { areaCode: '737', region: 'Texas', locality: ['Austin'] },
      { areaCode: '806', region: 'Texas', locality: ['Amarillo'] },
      { areaCode: '817', region: 'Texas', locality: ['Fort Worth'] },
      { areaCode: '830', region: 'Texas', locality: ['New Braunfels'] },
      { areaCode: '832', region: 'Texas', locality: ['Houston'] },
      { areaCode: '903', region: 'Texas', locality: ['Tyler'] },
      { areaCode: '915', region: 'Texas', locality: ['El Paso'] },
      { areaCode: '936', region: 'Texas', locality: ['Huntsville'] },
      { areaCode: '940', region: 'Texas', locality: ['Wichita Falls'] },
      { areaCode: '956', region: 'Texas', locality: ['Laredo'] },
      { areaCode: '972', region: 'Texas', locality: ['Dallas'] }
    ],
    'FL': [
      { areaCode: '239', region: 'Florida', locality: ['Fort Myers'] },
      { areaCode: '305', region: 'Florida', locality: ['Miami'] },
      { areaCode: '321', region: 'Florida', locality: ['Orlando'] },
      { areaCode: '352', region: 'Florida', locality: ['Gainesville'] },
      { areaCode: '386', region: 'Florida', locality: ['Daytona Beach'] },
      { areaCode: '407', region: 'Florida', locality: ['Orlando'] },
      { areaCode: '561', region: 'Florida', locality: ['West Palm Beach'] },
      { areaCode: '727', region: 'Florida', locality: ['St. Petersburg'] },
      { areaCode: '754', region: 'Florida', locality: ['Fort Lauderdale'] },
      { areaCode: '772', region: 'Florida', locality: ['Port St. Lucie'] },
      { areaCode: '786', region: 'Florida', locality: ['Miami'] },
      { areaCode: '813', region: 'Florida', locality: ['Tampa'] },
      { areaCode: '850', region: 'Florida', locality: ['Tallahassee'] },
      { areaCode: '863', region: 'Florida', locality: ['Lakeland'] },
      { areaCode: '904', region: 'Florida', locality: ['Jacksonville'] },
      { areaCode: '941', region: 'Florida', locality: ['Sarasota'] },
      { areaCode: '954', region: 'Florida', locality: ['Fort Lauderdale'] }
    ],
    'IL': [
      { areaCode: '217', region: 'Illinois', locality: ['Springfield'] },
      { areaCode: '224', region: 'Illinois', locality: ['Suburban Chicago'] },
      { areaCode: '309', region: 'Illinois', locality: ['Peoria'] },
      { areaCode: '312', region: 'Illinois', locality: ['Chicago'] },
      { areaCode: '331', region: 'Illinois', locality: ['Aurora'] },
      { areaCode: '618', region: 'Illinois', locality: ['Southern Illinois'] },
      { areaCode: '630', region: 'Illinois', locality: ['Aurora', 'Naperville'] },
      { areaCode: '708', region: 'Illinois', locality: ['Chicago Suburbs'] },
      { areaCode: '773', region: 'Illinois', locality: ['Chicago'] },
      { areaCode: '779', region: 'Illinois', locality: ['Rockford'] },
      { areaCode: '815', region: 'Illinois', locality: ['Rockford', 'Joliet'] },
      { areaCode: '847', region: 'Illinois', locality: ['Suburban Chicago'] },
      { areaCode: '872', region: 'Illinois', locality: ['Chicago'] }
    ]
  };

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

  async getAreaCodes(countryCode: string, state?: string): Promise<AreaCode[]> {
    try {
      // For US, use our static data
      if (countryCode === 'US') {
        if (state && AreaCodesModule.US_AREA_CODES[state]) {
          return AreaCodesModule.US_AREA_CODES[state];
        }
        
        // Return all US area codes if no state specified
        return Object.values(AreaCodesModule.US_AREA_CODES).flat();
      }

      // For other countries, try to fetch from Twilio
      const client = this.getTwilioClient();
      const numbers = await client.availablePhoneNumbers(countryCode)
        .local
        .list({ limit: 100 });

      // Extract unique area codes from available numbers
      const areaCodeMap = new Map<string, AreaCode>();
      
      numbers.forEach(number => {
        if (number.phoneNumber) {
          // Extract area code (this logic may vary by country)
          let areaCode = '';
          if (countryCode === 'US' || countryCode === 'CA') {
            // North American format: +1AAANNNXXXX
            areaCode = number.phoneNumber.substring(2, 5);
          } else {
            // For other countries, this would need country-specific logic
            areaCode = number.phoneNumber.substring(0, 5);
          }

          if (areaCode && !areaCodeMap.has(areaCode)) {
            areaCodeMap.set(areaCode, {
              areaCode,
              region: number.region || '',
              locality: number.locality ? [number.locality] : []
            });
          } else if (areaCode && number.locality) {
            // Add locality if not already present
            const existing = areaCodeMap.get(areaCode)!;
            if (!existing.locality?.includes(number.locality)) {
              existing.locality = [...(existing.locality || []), number.locality];
            }
          }
        }
      });

      return Array.from(areaCodeMap.values());
    } catch (error) {
      console.error(`Error fetching area codes for ${countryCode}:`, error);
      throw new Error(`Failed to fetch area codes for ${countryCode}`);
    }
  }

  async getAreaCodesByRegion(countryCode: string, region: string): Promise<AreaCode[]> {
    const allAreaCodes = await this.getAreaCodes(countryCode);
    return allAreaCodes.filter(ac => 
      ac.region.toLowerCase().includes(region.toLowerCase()) ||
      ac.locality?.some(l => l.toLowerCase().includes(region.toLowerCase()))
    );
  }
}

export const areaCodesModule = new AreaCodesModule();