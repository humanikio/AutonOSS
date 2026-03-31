/**
 * PhoneNumberBrowser
 *
 * Modal for browsing and selecting purchased Twilio phone numbers.
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Phone, Check, Loader2, ExternalLink } from 'lucide-react';

interface PhoneNumberBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNumber: (phoneNumber: string, twilioSid?: string) => void;
  selectedNumber?: string;
  purchasedNumbers: PurchasedPhoneNumber[];
  isLoading: boolean;
  onLoadNumbers: () => Promise<void>;
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

export default function PhoneNumberBrowser({
  isOpen,
  onClose,
  onSelectNumber,
  selectedNumber,
  purchasedNumbers,
  isLoading,
  onLoadNumbers,
}: PhoneNumberBrowserProps) {
  const [selectedTemp, setSelectedTemp] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      onLoadNumbers();
      setSelectedTemp(selectedNumber || null);
    }
  }, [isOpen, selectedNumber, onLoadNumbers]);

  const handleSelect = () => {
    if (selectedTemp) {
      const number = purchasedNumbers.find((n) => n.phoneNumber === selectedTemp);
      if (number) {
        onSelectNumber(number.phoneNumber, number.twilioSid);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-900">
                Select Phone Number
              </h3>
              <p className="text-sm text-slate-500">
                Choose from your purchased Twilio numbers
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
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Loading phone numbers...</p>
              </div>
            </div>
          ) : purchasedNumbers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
              <Phone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-slate-900 mb-2">
                No Phone Numbers Found
              </h4>
              <p className="text-slate-600 mb-4">
                You need to purchase a phone number first
              </p>
              <a
                href="/settings/phoneNumbers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>Purchase Phone Numbers</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {purchasedNumbers.map((number) => {
                const isSelected = selectedTemp === number.phoneNumber;
                return (
                  <button
                    key={number.phoneNumber}
                    onClick={() => setSelectedTemp(number.phoneNumber)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-base font-medium text-slate-900">
                            {number.phoneNumber}
                          </p>
                          {isSelected && (
                            <Check className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {number.friendlyName}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {number.capabilities.voice && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              Voice
                            </span>
                          )}
                          {number.capabilities.sms && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              SMS
                            </span>
                          )}
                          {number.capabilities.mms && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                              MMS
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">
                            {number.countryCode}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600">
            {selectedTemp ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Number selected: <span className="font-medium">{selectedTemp}</span>
              </span>
            ) : (
              <span>Select a phone number to continue</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedTemp}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
