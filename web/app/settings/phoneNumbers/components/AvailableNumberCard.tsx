'use client';

import { Phone, MapPin, Eye, Check, X } from 'lucide-react';
import { AvailablePhoneNumber } from '@/services/phoneNumberService';

interface AvailableNumberCardProps {
  number: AvailablePhoneNumber;
  onViewDetails: (number: AvailablePhoneNumber) => void;
  onPurchase?: (number: AvailablePhoneNumber) => void;
  isLoading?: boolean;
}

export default function AvailableNumberCard({ number, onViewDetails, onPurchase, isLoading }: AvailableNumberCardProps) {
  const formatPhoneNumber = (phoneNumber: string) => {
    // Format US numbers
    if (phoneNumber.startsWith('+1') && phoneNumber.length === 12) {
      const cleaned = phoneNumber.substring(2);
      return `+1 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return phoneNumber;
  };

  const getAddressRequirementLabel = (requirement: string) => {
    switch (requirement) {
      case 'none':
        return { label: 'No address required', color: 'text-green-600 bg-green-50' };
      case 'any':
        return { label: 'Any address required', color: 'text-yellow-600 bg-yellow-50' };
      case 'local':
        return { label: 'Local address required', color: 'text-orange-600 bg-orange-50' };
      case 'foreign':
        return { label: 'Foreign address required', color: 'text-red-600 bg-red-50' };
      default:
        return { label: requirement, color: 'text-gray-600 bg-gray-50' };
    }
  };

  const addressReq = getAddressRequirementLabel(number.addressRequirements);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Phone className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 text-lg">
              {formatPhoneNumber(number.phoneNumber)}
            </h3>
            {number.friendlyName && (
              <p className="text-sm text-gray-500">{number.friendlyName}</p>
            )}
          </div>
        </div>
        {number.beta && (
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md font-medium">
            Beta
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Location */}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {[number.locality, number.region, number.postalCode]
              .filter(Boolean)
              .join(', ') || number.isoCountry}
          </span>
        </div>

        {/* Capabilities */}
        <div className="flex flex-wrap gap-2">
          {number.capabilities.voice && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
              <Check className="h-3 w-3" />
              Voice
            </div>
          )}
          {number.capabilities.sms && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
              <Check className="h-3 w-3" />
              SMS
            </div>
          )}
          {number.capabilities.mms && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
              <Check className="h-3 w-3" />
              MMS
            </div>
          )}
          {number.capabilities.fax && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
              <Check className="h-3 w-3" />
              Fax
            </div>
          )}
        </div>

        {/* Address Requirements */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-md font-medium ${addressReq.color}`}>
            {addressReq.label}
          </span>
        </div>

        {/* View Details Button */}
        <div className="pt-3 border-t border-gray-100">
          <button
            onClick={() => onViewDetails(number)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                View Details & Pricing
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}