/**
 * AgentChannelsConfig
 *
 * Complete channel configuration with phone number provisioning and email setup.
 */

'use client';

import { useState, useEffect } from 'react';
import { Phone, MessageSquare, Mail, Settings, ExternalLink } from 'lucide-react';
import { Agent } from '../../types';
import { useChannelProvisioning } from '../../services/useChannelProvisioning';
import PhoneNumberBrowser from './channels/PhoneNumberBrowser';
import EmailAddressBrowser from './channels/EmailAddressBrowser';

interface AgentChannelsConfigProps {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}

const CHANNEL_TYPES = [
  {
    id: 'phone' as const,
    name: 'Phone',
    icon: Phone,
    description: 'Voice calls',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'sms' as const,
    name: 'SMS',
    icon: MessageSquare,
    description: 'Text messages',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'email' as const,
    name: 'Email',
    icon: Mail,
    description: 'Email channel',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];

export default function AgentChannelsConfig({ agent, onUpdate }: AgentChannelsConfigProps) {
  const {
    channels,
    purchasedNumbers,
    isLoading,
    error,
    loadPurchasedNumbers,
    selectPhoneNumber,
    configureEmail,
    toggleChannel,
  } = useChannelProvisioning(agent.id!, agent.channels);

  const [isPhoneNumberBrowserOpen, setIsPhoneNumberBrowserOpen] = useState(false);
  const [isEmailBrowserOpen, setIsEmailBrowserOpen] = useState(false);

  // Sync local channels state with parent agent
  useEffect(() => {
    onUpdate({ channels });
  }, [channels, onUpdate]);

  const handleToggleChannel = async (channelId: 'phone' | 'sms' | 'email', enabled: boolean) => {
    try {
      await toggleChannel(channelId, enabled);
    } catch (err) {
      console.error(`Failed to toggle ${channelId}:`, err);
    }
  };

  const handleSelectPhoneNumber = async (phoneNumber: string, twilioSid?: string) => {
    try {
      await selectPhoneNumber(phoneNumber, twilioSid);
    } catch (err) {
      console.error('Failed to select phone number:', err);
    }
  };

  const handleConfigureEmail = async (email: string) => {
    try {
      await configureEmail(email);
    } catch (err) {
      console.error('Failed to configure email:', err);
      throw err;
    }
  };

  const isChannelEnabled = (channelId: string) => {
    return channels[channelId as keyof typeof channels]?.enabled || false;
  };

  const getChannelValue = (channelId: string) => {
    if (channelId === 'phone') return channels.phone?.phoneNumber;
    if (channelId === 'email') return channels.email?.email;
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Channel Configuration</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure communication channels for your agent
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      {/* Channel Grid */}
      <div className="grid grid-cols-1 gap-3">
        {CHANNEL_TYPES.map((channel) => {
          const Icon = channel.icon;
          const enabled = isChannelEnabled(channel.id);
          const value = getChannelValue(channel.id);

          return (
            <div
              key={channel.id}
              className={`p-4 rounded-lg border transition-all ${
                enabled
                  ? 'bg-slate-50/50 border-slate-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${channel.bgColor}`}>
                    <Icon className={`h-5 w-5 ${channel.color}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">{channel.name}</h4>
                    <p className="text-xs text-slate-500">{channel.description}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleToggleChannel(channel.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Channel-specific configuration */}
              {channel.id === 'phone' && (
                <div className="space-y-2">
                  {value ? (
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                      <span className="text-sm text-slate-700 font-mono">{value}</span>
                      <button
                        onClick={() => setIsPhoneNumberBrowserOpen(true)}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsPhoneNumberBrowserOpen(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Configure Phone Number
                    </button>
                  )}
                </div>
              )}

              {channel.id === 'email' && (
                <div className="space-y-2">
                  {value ? (
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                      <span className="text-sm text-slate-700">{value}</span>
                      <button
                        onClick={() => setIsEmailBrowserOpen(true)}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEmailBrowserOpen(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Configure Email
                    </button>
                  )}
                </div>
              )}

              {channel.id === 'sms' && channels.phone?.phoneNumber && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-900">
                    SMS uses phone number: <span className="font-mono">{channels.phone.phoneNumber}</span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Phone Numbers Management Link */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-slate-900 mb-1">
              Need more phone numbers?
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              Purchase and manage phone numbers in the Settings page
            </p>
            <a
              href="/settings/phoneNumbers"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
            >
              <span>Manage Phone Numbers</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PhoneNumberBrowser
        isOpen={isPhoneNumberBrowserOpen}
        onClose={() => setIsPhoneNumberBrowserOpen(false)}
        onSelectNumber={handleSelectPhoneNumber}
        selectedNumber={channels.phone?.phoneNumber}
        purchasedNumbers={purchasedNumbers}
        isLoading={isLoading}
        onLoadNumbers={loadPurchasedNumbers}
      />

      <EmailAddressBrowser
        isOpen={isEmailBrowserOpen}
        onClose={() => setIsEmailBrowserOpen(false)}
        onConfigureEmail={handleConfigureEmail}
        currentEmail={channels.email?.email}
      />
    </div>
  );
}
