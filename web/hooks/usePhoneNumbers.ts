import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { phoneNumberService } from '@/services/phoneNumberService';

export interface PhoneNumberOption {
  phoneNumber: string;
  twilioSid: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
    fax: boolean;
  };
}

export function usePhoneNumbers() {
  const { tenant } = useAuth();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhoneNumbers = async () => {
    if (!tenant?.id) {
      console.log('No tenant available, skipping phone number fetch');
      setPhoneNumbers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log(`Fetching phone numbers for tenant: ${tenant.id}`);
      const numbers = await phoneNumberService.getPurchasedNumbers();
      
      // Filter to only SMS-enabled numbers
      const smsNumbers = numbers.filter(num => num.capabilities.sms).map(num => ({
        phoneNumber: num.phoneNumber,
        twilioSid: num.twilioSid,
        friendlyName: num.friendlyName,
        capabilities: num.capabilities
      }));
      
      setPhoneNumbers(smsNumbers);
      console.log(`Found ${smsNumbers.length} SMS-enabled phone numbers for tenant ${tenant.id}`);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch phone numbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneNumbers();
  }, [tenant?.id]); // Refetch when tenant changes

  return {
    phoneNumbers,
    loading,
    error,
    refetch: fetchPhoneNumbers
  };
}