'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { AvailablePhoneNumber, phoneNumberService } from '@/services/phoneNumberService';

interface PricingData {
  phoneNumber: string;
  numberType: string;
  countryCode: string;
  pricing: {
    setupFee: number;
    monthlyFee: number;
    currency: string;
    total: number;
  };
}

interface PhoneNumberPricingModalProps {
  number: AvailablePhoneNumber;
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (number: AvailablePhoneNumber, pricing: PricingData) => void;
}

export default function PhoneNumberPricingModal({
  number,
  isOpen,
  onClose,
  onPurchase
}: PhoneNumberPricingModalProps) {
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load pricing when modal opens
  const loadPricing = async () => {
    if (pricingData) return; // Already loaded

    setIsLoadingPricing(true);
    setError(null);

    try {
      // Determine number type from capabilities or default to local
      let numberType = 'local';
      if (number.phoneNumber.includes('toll') || number.phoneNumber.includes('800')) {
        numberType = 'tollFree';
      }

      const pricing = await phoneNumberService.getPhoneNumberPricing(
        number.phoneNumber,
        numberType,
        number.isoCountry
      );

      setPricingData(pricing);
    } catch (error) {
      console.error('Error loading pricing:', error);
      setError(error instanceof Error ? error.message : 'Failed to load pricing');
    } finally {
      setIsLoadingPricing(false);
    }
  };

  // Load pricing when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPricing();
    }
  }, [isOpen]);

  const handlePurchase = async () => {
    if (!pricingData) return;

    setIsPurchasing(true);
    try {
      await onPurchase(number, pricingData);
    } catch (error) {
      console.error('Purchase error:', error);
      setError(error instanceof Error ? error.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Phone Number Details</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Phone Number Info */}
          <div className="space-y-4">
            <div>
              <h4 className="text-base font-medium text-gray-900 mb-3">Phone Number</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-lg font-mono text-gray-900">{number.phoneNumber}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {number.locality}, {number.region} {number.isoCountry}
                </p>
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Capabilities</h5>
              <div className="flex flex-wrap gap-2">
                {number.capabilities.voice && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Voice</span>
                )}
                {number.capabilities.sms && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">SMS</span>
                )}
                {number.capabilities.mms && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">MMS</span>
                )}
                {number.capabilities.fax && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">Fax</span>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Details
            </h4>

            {isLoadingPricing ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                <span className="ml-3 text-gray-600">Loading pricing...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={loadPricing}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Try again
                </button>
              </div>
            ) : pricingData ? (
              <div className="space-y-4">
                {/* Setup Fee */}
                {pricingData.pricing.setupFee > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Setup Fee</span>
                    <span className="font-medium">
                      ${pricingData.pricing.setupFee.toFixed(2)} {pricingData.pricing.currency}
                    </span>
                  </div>
                )}

                {/* Monthly Fee */}
                <div className="flex justify-between items-center py-2 border-t border-gray-100">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Monthly Fee
                  </span>
                  <span className="font-medium">
                    ${pricingData.pricing.monthlyFee.toFixed(2)} {pricingData.pricing.currency}/month
                  </span>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center py-3 border-t border-gray-200 bg-gray-50 -mx-2 px-2 rounded">
                  <span className="font-medium text-gray-900">Total Today</span>
                  <span className="font-bold text-lg text-gray-900">
                    ${pricingData.pricing.total.toFixed(2)} {pricingData.pricing.currency}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  You'll be charged ${pricingData.pricing.monthlyFee.toFixed(2)} {pricingData.pricing.currency} monthly for this number.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={!pricingData || isPurchasing || isLoadingPricing}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Purchase Number
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}