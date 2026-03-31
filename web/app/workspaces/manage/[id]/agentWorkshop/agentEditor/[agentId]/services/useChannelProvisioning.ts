/**
 * useChannelProvisioning Hook
 *
 * Manages phone, SMS, and email channel configuration and provisioning.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { phoneNumberService, AvailablePhoneNumber } from '@/services/phoneNumberService';

interface ChannelsStatus {
  phone?: { enabled: boolean; phoneNumber?: string; twilioSid?: string };
  sms?: { enabled: boolean };
  email?: { enabled: boolean; email?: string };
  webhook?: { enabled: boolean };
}

interface PurchasedPhoneNumber {
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
}

interface UseChannelProvisioningReturn {
  // State
  channels: ChannelsStatus;
  purchasedNumbers: PurchasedPhoneNumber[];
  isLoading: boolean;
  error: string | null;

  // Phone Number Management
  loadPurchasedNumbers: () => Promise<void>;
  selectPhoneNumber: (phoneNumber: string, twilioSid?: string) => Promise<void>;
  removePhoneNumber: () => Promise<void>;

  // Email Management
  configureEmail: (email: string) => Promise<void>;

  // Channel Toggles
  toggleChannel: (channel: 'phone' | 'sms' | 'email', enabled: boolean) => Promise<void>;

  // Phone Number Purchase
  purchasePhoneNumber: (number: AvailablePhoneNumber) => Promise<void>;
}

export function useChannelProvisioning(
  agentId: string,
  initialChannels?: ChannelsStatus
): UseChannelProvisioningReturn {
  const { getToken } = useAuth();

  // State
  const [channels, setChannels] = useState<ChannelsStatus>(
    initialChannels || {
      phone: { enabled: false },
      sms: { enabled: false },
      email: { enabled: false },
      webhook: { enabled: false },
    }
  );
  const [purchasedNumbers, setPurchasedNumbers] = useState<PurchasedPhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load purchased phone numbers from Twilio
   */
  const loadPurchasedNumbers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const numbers = await phoneNumberService.getPurchasedNumbers();
      setPurchasedNumbers(numbers as PurchasedPhoneNumber[]);
    } catch (err) {
      console.error('Error loading purchased numbers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load phone numbers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update channel via API
   */
  const updateChannelAPI = useCallback(
    async (channel: 'phone' | 'sms' | 'email', enabled: boolean) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Map frontend channel names to backend channel types
      const channelTypeMapping: Record<string, string> = {
        phone: 'voice',
        sms: 'sms',
        email: 'email',
      };

      const response = await fetch(`${apiUrl}/api/agents/${agentId}/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'updateEnabledChannels',
          channelType: channelTypeMapping[channel],
          enabled,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update channel setting');
      }

      return response.json();
    },
    [agentId, getToken]
  );

  /**
   * Toggle channel on/off
   */
  const toggleChannel = useCallback(
    async (channel: 'phone' | 'sms' | 'email', enabled: boolean) => {
      // Optimistic update
      setChannels((prev) => ({
        ...prev,
        [channel]: {
          ...(prev[channel] || {}),
          enabled,
        },
      }));

      try {
        await updateChannelAPI(channel, enabled);
        console.log(`Successfully updated ${channel} channel: ${enabled ? 'enabled' : 'disabled'}`);
      } catch (err) {
        console.error(`Error updating ${channel} channel:`, err);
        setError(err instanceof Error ? err.message : 'Failed to update channel');

        // Revert on error
        setChannels((prev) => ({
          ...prev,
          [channel]: {
            ...(prev[channel] || {}),
            enabled: !enabled,
          },
        }));

        throw err;
      }
    },
    [updateChannelAPI]
  );

  /**
   * Select and provision a phone number
   */
  const selectPhoneNumber = useCallback(
    async (phoneNumber: string, twilioSid?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        // 1. Update phone number
        const response = await fetch(`${apiUrl}/api/agents/${agentId}/manage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'updatePhoneNumber',
            phoneNumber,
            twilioSid,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update phone number');
        }

        // 2. Auto-enable phone and SMS channels
        setChannels((prev) => ({
          ...prev,
          phone: {
            enabled: true,
            phoneNumber,
            twilioSid,
          },
          sms: {
            enabled: true,
          },
        }));

        // Update backend
        await Promise.all([
          updateChannelAPI('phone', true),
          updateChannelAPI('sms', true),
        ]);

        console.log('Phone number selected and channels enabled:', phoneNumber);
      } catch (err) {
        console.error('Error selecting phone number:', err);
        setError(err instanceof Error ? err.message : 'Failed to select phone number');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [agentId, getToken, updateChannelAPI]
  );

  /**
   * Remove phone number from agent
   */
  const removePhoneNumber = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(`${apiUrl}/api/agents/${agentId}/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'updatePhoneNumber',
          phoneNumber: null,
          twilioSid: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove phone number');
      }

      // Update local state
      setChannels((prev) => ({
        ...prev,
        phone: {
          enabled: false,
        },
        sms: {
          enabled: false,
        },
      }));

      console.log('Phone number removed');
    } catch (err) {
      console.error('Error removing phone number:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove phone number');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [agentId, getToken]);

  /**
   * Configure email address for agent
   */
  const configureEmail = useCallback(
    async (email: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        const response = await fetch(`${apiUrl}/api/agents/${agentId}/manage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'updateEmail',
            email,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update email');
        }

        // Update local state
        setChannels((prev) => ({
          ...prev,
          email: {
            enabled: true,
            email,
          },
        }));

        // Enable email channel
        await updateChannelAPI('email', true);

        console.log('Email configured:', email);
      } catch (err) {
        console.error('Error configuring email:', err);
        setError(err instanceof Error ? err.message : 'Failed to configure email');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [agentId, getToken, updateChannelAPI]
  );

  /**
   * Purchase a phone number
   */
  const purchasePhoneNumber = useCallback(async (number: AvailablePhoneNumber) => {
    setIsLoading(true);
    setError(null);

    try {
      let numberType = 'local';
      if (number.phoneNumber.includes('toll') || number.phoneNumber.includes('800')) {
        numberType = 'tollFree';
      }

      const purchaseResponse = await phoneNumberService.initiatePurchase(
        number.phoneNumber,
        numberType,
        number.isoCountry,
        `Phone Number ${number.phoneNumber}`
      );

      if (purchaseResponse.checkoutUrl) {
        window.location.href = purchaseResponse.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Error purchasing phone number:', err);
      setError(err instanceof Error ? err.message : 'Failed to purchase phone number');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    channels,
    purchasedNumbers,
    isLoading,
    error,

    // Phone Number Management
    loadPurchasedNumbers,
    selectPhoneNumber,
    removePhoneNumber,

    // Email Management
    configureEmail,

    // Channel Toggles
    toggleChannel,

    // Phone Number Purchase
    purchasePhoneNumber,
  };
}
