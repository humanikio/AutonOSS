/**
 * DestinationWebhookDetailModal
 *
 * Modal displaying destination webhook details.
 */

'use client';

import { X, Globe, Copy } from 'lucide-react';
import { useState } from 'react';

interface DestinationWebhookDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: {
    destinationKey: string;
    name: string;
    description: string;
    category: string;
    destinationUrl: string;
    isActive: boolean;
    createdAt: string;
  } | null;
}

export default function DestinationWebhookDetailModal({
  isOpen,
  onClose,
  destination,
}: DestinationWebhookDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !destination) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(destination.destinationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-900">
                {destination.name}
              </h3>
              <p className="text-sm text-slate-500">
                Created {new Date(destination.createdAt).toLocaleDateString()}
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
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Category
            </label>
            <span className="text-sm text-slate-900 font-medium capitalize">
              {destination.category}
            </span>
          </div>

          {destination.description && (
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Description
              </label>
              <p className="text-sm text-slate-700">{destination.description}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Destination URL
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 text-xs bg-slate-900 text-slate-50 rounded-lg overflow-x-auto">
                {destination.destinationUrl}
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

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Status
            </label>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${
                destination.isActive
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${destination.isActive ? 'bg-emerald-500' : 'bg-gray-500'}`} />
              {destination.isActive ? 'Active' : 'Inactive'}
            </span>
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
