/**
 * WebhookCard
 *
 * Individual webhook display card with quick actions.
 */

'use client';

import { MessageSquare, Mail, Phone, Webhook, Copy, Trash2, Eye, Globe } from 'lucide-react';
import { WebhookData } from '@/lib/services/webhookService';

interface WebhookCardProps {
  webhook: WebhookData & { isDestination?: boolean; destinationKey?: string };
  actionName?: string | null;
  onView: () => void;
  onCopy?: () => void;
  onDelete: () => void;
}

const getChannelInfo = (channel: string) => {
  switch (channel) {
    case 'sms':
      return {
        icon: MessageSquare,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      };
    case 'email':
      return {
        icon: Mail,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      };
    case 'phone':
      return {
        icon: Phone,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      };
    default:
      return {
        icon: Webhook,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
      };
  }
};

const getMethodColor = (method: string) => {
  switch (method) {
    case 'inbound':
      return 'bg-green-100 text-green-700';
    case 'outbound':
      return 'bg-blue-100 text-blue-700';
    case 'destination':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export default function WebhookCard({
  webhook,
  actionName,
  onView,
  onCopy,
  onDelete,
}: WebhookCardProps) {
  const channelInfo = getChannelInfo(webhook.channel);
  const Icon = channelInfo.icon;

  return (
    <div
      className={`bg-white rounded-lg border cursor-pointer transition-all p-3 ${
        webhook.isDestination
          ? 'border-purple-200 hover:border-purple-300 hover:shadow-sm bg-gradient-to-r from-purple-50/50 to-white'
          : 'border-slate-200 hover:border-primary-300 hover:shadow-sm'
      }`}
      onClick={onView}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Channel Icon */}
          <div className={`p-1 ${channelInfo.bgColor} rounded`}>
            <Icon className={`h-3 w-3 ${channelInfo.color}`} />
          </div>

          {/* Webhook Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-medium text-slate-900 truncate">
                {webhook.name || `${webhook.channel.toUpperCase()} ${webhook.method}`}
              </span>
              <span
                className={`px-1.5 py-0.5 text-xs rounded-full ${getMethodColor(
                  webhook.isDestination ? 'destination' : webhook.method
                )}`}
              >
                {webhook.isDestination
                  ? 'Dest'
                  : webhook.method.charAt(0).toUpperCase() + webhook.method.slice(1)}
              </span>
              {webhook.isDestination && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-0.5">
                  <Globe className="h-2.5 w-2.5" />
                </span>
              )}
              {!webhook.isActive && (
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  Inactive
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="truncate">
                {webhook.description || `${webhook.channel} ${webhook.method}`}
              </span>
              <span>•</span>
              <span className="whitespace-nowrap">
                {new Date(webhook.createdAt).toLocaleDateString()}
              </span>
              {actionName && (
                <>
                  <span>•</span>
                  <span className="text-primary-600 font-medium whitespace-nowrap">
                    {actionName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          {!webhook.isDestination && onCopy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors"
              title="Copy webhook URL"
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title={`Delete ${webhook.isDestination ? 'destination webhook' : 'webhook'}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <div
            className="p-1 text-slate-400"
            title="Click to view details"
          >
            <Eye className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
