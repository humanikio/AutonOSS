/**
 * WebhookDetailsModal
 *
 * Modal displaying full webhook details with example payload.
 */

'use client';

import { X, Copy, ExternalLink, MessageSquare, Mail, Phone, Webhook } from 'lucide-react';
import { useState } from 'react';
import { WebhookData } from '@/lib/services/webhookService';
import WebhookExamplePayload from './WebhookExamplePayload';

interface WebhookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhook: WebhookData | null;
  webhookUrl: string;
  examplePayload: object;
}

const getChannelInfo = (channel: string) => {
  switch (channel) {
    case 'sms':
      return { icon: MessageSquare, color: 'text-green-600', bgColor: 'bg-green-50' };
    case 'email':
      return { icon: Mail, color: 'text-purple-600', bgColor: 'bg-purple-50' };
    case 'phone':
      return { icon: Phone, color: 'text-blue-600', bgColor: 'bg-blue-50' };
    default:
      return { icon: Webhook, color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
};

export default function WebhookDetailsModal({
  isOpen,
  onClose,
  webhook,
  webhookUrl,
  examplePayload,
}: WebhookDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !webhook) return null;

  const channelInfo = getChannelInfo(webhook.channel);
  const Icon = channelInfo.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${channelInfo.bgColor} rounded-lg`}>
              <Icon className={`h-5 w-5 ${channelInfo.color}`} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-900">
                {webhook.name || `${webhook.channel.toUpperCase()} ${webhook.method} Webhook`}
              </h3>
              <p className="text-sm text-slate-500">
                Created {new Date(webhook.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Webhook Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Channel
              </label>
              <span className="text-sm text-slate-900 font-medium capitalize">
                {webhook.channel}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Method
              </label>
              <span className="text-sm text-slate-900 font-medium capitalize">
                {webhook.method}
              </span>
            </div>
          </div>

          {webhook.description && (
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Description
              </label>
              <p className="text-sm text-slate-700">{webhook.description}</p>
            </div>
          )}

          {/* Webhook URL */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Webhook URL
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 text-xs bg-slate-900 text-slate-50 rounded-lg overflow-x-auto">
                {webhookUrl}
              </code>
              <button
                onClick={handleCopy}
                className="px-3 py-2 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-1.5"
              >
                <Copy className="h-3 w-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Status
            </label>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${
                webhook.isActive
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${webhook.isActive ? 'bg-emerald-500' : 'bg-gray-500'}`} />
              {webhook.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Example Payload */}
          <WebhookExamplePayload payload={examplePayload} title="Example Payload" />

          {/* Documentation Link */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs text-slate-600">
              <span className="font-medium">Security:</span> Requests include{' '}
              <code className="bg-slate-100 px-1 rounded">X-Pulseline-Signature</code> header for
              verification
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
