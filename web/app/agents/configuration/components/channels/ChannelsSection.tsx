'use client';

import { useState } from 'react';
import { Phone, MessageSquare, Mail, Search, Plus, ExternalLink, AlertCircle } from 'lucide-react';
import { ConfigurationSectionProps } from '../../types';
import PhoneNumberBrowserModal from './PhoneNumberBrowserModal';
import EmailBrowserModal from './EmailBrowserModal';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function ChannelsSection({ agentId, config, onUpdate }: ConfigurationSectionProps) {
  const { user, getToken } = useAuth();
  const [isPhoneNumberBrowserOpen, setIsPhoneNumberBrowserOpen] = useState(false);
  const [isEmailBrowserOpen, setIsEmailBrowserOpen] = useState(false);

  const handleChannelsUpdate = (channelsUpdates: any) => {
    onUpdate({
      channels: {
        ...config.channels,
        ...channelsUpdates
      }
    });
  };

  // Extract API logic for reusability
  const updateChannelAPI = async (channel: 'phone' | 'sms' | 'email', enabled: boolean) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await getToken();
    if (!token) {
      throw new Error('Failed to get authentication token');
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Map frontend channel names to backend channel types
    const channelTypeMapping: Record<string, string> = {
      'phone': 'voice',
      'sms': 'sms',
      'email': 'email'
    };
    
    const response = await fetch(`${apiUrl}/api/agents/${agentId}/manage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'updateEnabledChannels',
        channelType: channelTypeMapping[channel],
        enabled
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update channel setting');
    }

    return response.json();
  };

  const toggleChannel = async (channel: 'phone' | 'sms' | 'email', enabled: boolean) => {
    // Update local state first for immediate UI feedback
    handleChannelsUpdate({
      [channel]: {
        ...config.channels?.[channel],
        enabled
      }
    });

    // Make API call to update the agent document
    try {
      await updateChannelAPI(channel, enabled);
      console.log(`Successfully updated ${channel} channel: ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(`Error updating ${channel} channel:`, error);
      
      // Revert the local state change on error
      handleChannelsUpdate({
        [channel]: {
          ...config.channels?.[channel],
          enabled: !enabled
        }
      });
      
      alert(`Failed to update ${channel} channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const updateChannelConfig = (channel: 'phone' | 'sms' | 'email', updates: any) => {
    handleChannelsUpdate({
      [channel]: {
        ...config.channels?.[channel],
        ...updates
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSelectPhoneNumber = async (phoneNumber: string, twilioSid?: string) => {
    // Check if channels were previously enabled
    const wasPhoneEnabled = config.channels?.phone?.enabled || false;
    const wasSmsEnabled = config.channels?.sms?.enabled || false;
    const hadPreviousNumber = !!(config.channels?.phone?.phoneNumber);
    
    // Update phone number config and auto-enable channels
    handleChannelsUpdate({
      phone: {
        phoneNumber,
        twilioSid,
        enabled: true // Auto-enable phone channel
      },
      sms: {
        enabled: true // Auto-enable SMS channel
      }
    });
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the Firebase ID token for authentication
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // 1. Update phone number
      const response = await fetch(`${apiUrl}/api/agents/${agentId}/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'updatePhoneNumber',
          phoneNumber,
          twilioSid
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agent phone number');
      }

      const data = await response.json();
      console.log('Agent phone number updated successfully:', data.message);
      
      // 2. Auto-enable phone and SMS channels (only if they weren't already enabled or no previous number)
      const channelsToEnable = [];
      if (!wasPhoneEnabled || !hadPreviousNumber) {
        channelsToEnable.push({ channel: 'phone' as const, enabled: true });
      }
      if (!wasSmsEnabled || !hadPreviousNumber) {
        channelsToEnable.push({ channel: 'sms' as const, enabled: true });
      }
      
      // Enable channels that need to be enabled
      const enablePromises = channelsToEnable.map(async ({ channel }) => {
        try {
          await updateChannelAPI(channel, true);
          console.log(`Auto-enabled ${channel} channel`);
          return { channel, success: true };
        } catch (error) {
          console.error(`Failed to auto-enable ${channel} channel:`, error);
          return { channel, success: false, error };
        }
      });
      
      if (enablePromises.length > 0) {
        const results = await Promise.allSettled(enablePromises.map(p => p));
        const resolvedResults = await Promise.all(enablePromises);
        
        const failedChannels = resolvedResults.filter(r => !r.success);
        const succeededChannels = resolvedResults.filter(r => r.success);
        
        if (succeededChannels.length > 0) {
          const channelNames = succeededChannels.map(r => r.channel === 'phone' ? 'Voice Calls' : 'SMS').join(' and ');
          console.log(`Phone number assigned and ${channelNames} auto-enabled`);
        }
        
        if (failedChannels.length > 0) {
          console.warn('Some channels failed to auto-enable:', failedChannels);
          // Don't show error to user as phone number assignment succeeded
        }
      } else {
        console.log('Phone number updated, channels were already enabled');
      }
      
    } catch (error) {
      console.error('Error updating agent phone number:', error);
      
      // Revert the local state changes on phone number assignment failure
      updateChannelConfig('phone', { 
        phoneNumber: config.channels?.phone?.phoneNumber, 
        twilioSid: config.channels?.phone?.twilioSid 
      });
      handleChannelsUpdate({
        phone: {
          ...config.channels?.phone,
          enabled: wasPhoneEnabled
        },
        sms: {
          ...config.channels?.sms,
          enabled: wasSmsEnabled
        }
      });
      
      alert(`Failed to update phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Extract email update API logic for reusability
  const updateEmailAPI = async (email: string, emailId?: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await getToken();
    if (!token) {
      throw new Error('Failed to get authentication token');
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    const response = await fetch(`${apiUrl}/api/agents/${agentId}/manage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'updateEmail',
        email,
        emailId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update agent email');
    }

    return response.json();
  };

  const handleSelectEmail = async (email: string, emailId?: string) => {
    // Check if channel was previously enabled
    const wasEmailEnabled = config.channels?.email?.enabled || false;
    const hadPreviousEmail = !!(config.channels?.email?.email);
    
    // Update email config and auto-enable channel
    handleChannelsUpdate({
      email: {
        email,
        emailId,
        enabled: true // Auto-enable email channel
      }
    });
    
    try {
      // 1. Update email via API
      const data = await updateEmailAPI(email, emailId);
      console.log('Agent email updated successfully:', data.message);
      
      // 2. Auto-enable email channel (only if it wasn't already enabled or no previous email)
      if (!wasEmailEnabled || !hadPreviousEmail) {
        try {
          await updateChannelAPI('email', true);
          console.log('Email assigned and auto-enabled');
        } catch (error) {
          console.error('Failed to auto-enable email channel:', error);
          // Don't show error to user as email assignment succeeded
        }
      } else {
        console.log('Email updated, channel was already enabled');
      }
      
    } catch (error) {
      console.error('Error updating agent email:', error);
      
      // Revert the local state changes on email assignment failure
      handleChannelsUpdate({
        email: {
          email: config.channels?.email?.email,
          emailId: config.channels?.email?.emailId,
          enabled: wasEmailEnabled
        }
      });
      
      alert(`Failed to update email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const hasPhoneNumber = !!(config.channels?.phone?.phoneNumber);
  const hasEmail = !!(config.channels?.email?.email);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Communication Channels</h3>
        <p className="text-gray-600 text-sm">Configure phone numbers, emails, and communication channels for your agent.</p>
      </div>
      
      {/* Assets Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Assets</h4>
          <p className="text-xs text-gray-500">Configure communication assets</p>
        </div>

        <div className="space-y-3">
          {/* Phone Number Asset */}
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded">
                  <Phone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h5 className="text-xs font-medium text-gray-900">Phone Number</h5>
                  <p className="text-xs text-gray-500">For voice calls and SMS</p>
                </div>
              </div>
              {hasPhoneNumber && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                  Connected
                </span>
              )}
            </div>

            {hasPhoneNumber ? (
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{config.channels?.phone?.phoneNumber}</p>
                  <p className="text-xs text-gray-500">Active number</p>
                </div>
                <button
                  onClick={() => setIsPhoneNumberBrowserOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Search className="h-3 w-3" />
                  Change
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">No phone number assigned</p>
                <div className="flex items-center gap-2">
                  <Link
                    href="/settings/phoneNumbers"
                    className="text-xs text-gray-600 hover:text-gray-700 flex items-center gap-0.5"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Add
                  </Link>
                  <button
                    onClick={() => setIsPhoneNumberBrowserOpen(true)}
                    className="px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    Assign
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Email Asset */}
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 rounded">
                  <Mail className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h5 className="text-xs font-medium text-gray-900">Email Address</h5>
                  <p className="text-xs text-gray-500">For email communication</p>
                </div>
              </div>
              {hasEmail && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                  Connected
                </span>
              )}
            </div>

            {hasEmail ? (
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{config.channels?.email?.email}</p>
                  <p className="text-xs text-gray-500">Active email</p>
                </div>
                <button
                  onClick={() => setIsEmailBrowserOpen(true)}
                  className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Search className="h-3 w-3" />
                  Change
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">No email address assigned</p>
                <div className="flex items-center gap-2">
                  <Link
                    href="/settings/emails"
                    className="text-xs text-gray-600 hover:text-gray-700 flex items-center gap-0.5"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Add
                  </Link>
                  <button
                    onClick={() => setIsEmailBrowserOpen(true)}
                    className="px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    Assign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Communication Channels */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Communication Channels</h4>
        <div className="space-y-2">
          
          {/* Phone Calls Channel */}
          <div className={`border rounded p-3 transition-all ${
            !hasPhoneNumber ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${hasPhoneNumber ? 'bg-blue-50' : 'bg-gray-100'}`}>
                  <Phone className={`h-3 w-3 ${hasPhoneNumber ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h5 className={`text-xs font-medium ${hasPhoneNumber ? 'text-gray-900' : 'text-gray-500'}`}>Voice Calls</h5>
                  <p className={`text-xs ${hasPhoneNumber ? 'text-gray-500' : 'text-gray-400'}`}>Inbound and outbound calls</p>
                </div>
              </div>
              <label className={`relative inline-flex items-center ${hasPhoneNumber ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="checkbox"
                  checked={config.channels?.phone?.enabled || false}
                  onChange={(e) => toggleChannel('phone', e.target.checked)}
                  disabled={!hasPhoneNumber}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:bg-gray-100 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>
            {!hasPhoneNumber && (
              <div className="mt-2 flex items-center gap-1 text-amber-600 bg-amber-50 p-1.5 rounded text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>Phone number required</span>
              </div>
            )}
          </div>

          {/* SMS Channel */}
          <div className={`border rounded p-3 transition-all ${
            !hasPhoneNumber ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${hasPhoneNumber ? 'bg-green-50' : 'bg-gray-100'}`}>
                  <MessageSquare className={`h-3 w-3 ${hasPhoneNumber ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h5 className={`text-xs font-medium ${hasPhoneNumber ? 'text-gray-900' : 'text-gray-500'}`}>SMS Messages</h5>
                  <p className={`text-xs ${hasPhoneNumber ? 'text-gray-500' : 'text-gray-400'}`}>Send and receive texts</p>
                </div>
              </div>
              <label className={`relative inline-flex items-center ${hasPhoneNumber ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="checkbox"
                  checked={config.channels?.sms?.enabled || false}
                  onChange={(e) => toggleChannel('sms', e.target.checked)}
                  disabled={!hasPhoneNumber}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600 peer-disabled:bg-gray-100 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>
            {!hasPhoneNumber && (
              <div className="mt-2 flex items-center gap-1 text-amber-600 bg-amber-50 p-1.5 rounded text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>Phone number required</span>
              </div>
            )}
          </div>

          {/* Email Channel */}
          <div className={`border rounded p-3 transition-all ${
            !hasEmail ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${hasEmail ? 'bg-purple-50' : 'bg-gray-100'}`}>
                  <Mail className={`h-3 w-3 ${hasEmail ? 'text-purple-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h5 className={`text-xs font-medium ${hasEmail ? 'text-gray-900' : 'text-gray-500'}`}>Email</h5>
                  <p className={`text-xs ${hasEmail ? 'text-gray-500' : 'text-gray-400'}`}>Email communication</p>
                </div>
              </div>
              <label className={`relative inline-flex items-center ${hasEmail ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="checkbox"
                  checked={config.channels?.email?.enabled || false}
                  onChange={(e) => toggleChannel('email', e.target.checked)}
                  disabled={!hasEmail}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-disabled:bg-gray-100 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>
            {!hasEmail && (
              <div className="mt-2 flex items-center gap-1 text-amber-600 bg-amber-50 p-1.5 rounded text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>Email address required</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Phone Number Browser Modal */}
      <PhoneNumberBrowserModal
        isOpen={isPhoneNumberBrowserOpen}
        onClose={() => setIsPhoneNumberBrowserOpen(false)}
        onSelectNumber={handleSelectPhoneNumber}
        selectedNumber={config.channels?.phone?.phoneNumber}
      />

      {/* Email Browser Modal */}
      <EmailBrowserModal
        isOpen={isEmailBrowserOpen}
        onClose={() => setIsEmailBrowserOpen(false)}
        onSelectEmail={handleSelectEmail}
        selectedEmail={config.channels?.email?.email}
      />

    </div>
  );
}