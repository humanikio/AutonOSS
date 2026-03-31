'use client';

import { useState, useEffect } from 'react';
import { X, Phone, Save } from 'lucide-react';

interface PhoneNumber {
  id: string;
  number: string;
  friendlyName: string;
  region: string;
  countryCode: string;
  provider: 'twilio' | 'auton';
  status: 'active' | 'inactive' | 'pending';
  capabilities: string[];
  monthlyFee: number;
  connectedAt: string;
  lastUsed?: string;
}

interface EditPhoneNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: PhoneNumber | null;
  onSave: (phoneNumberId: string, updatedData: { friendlyName: string }) => Promise<void>;
  isSaving?: boolean;
}

export default function EditPhoneNumberModal({
  isOpen,
  onClose,
  phoneNumber,
  onSave,
  isSaving = false
}: EditPhoneNumberModalProps) {
  const [friendlyName, setFriendlyName] = useState('');
  const [errors, setErrors] = useState<{ friendlyName?: string }>({});

  // Reset form when modal opens/closes or phone number changes
  useEffect(() => {
    if (isOpen && phoneNumber) {
      setFriendlyName(phoneNumber.friendlyName);
      setErrors({});
    } else {
      setFriendlyName('');
      setErrors({});
    }
  }, [isOpen, phoneNumber]);

  const validateForm = () => {
    const newErrors: { friendlyName?: string } = {};

    if (!friendlyName.trim()) {
      newErrors.friendlyName = 'Friendly name is required';
    } else if (friendlyName.trim().length < 3) {
      newErrors.friendlyName = 'Friendly name must be at least 3 characters';
    } else if (friendlyName.trim().length > 64) {
      newErrors.friendlyName = 'Friendly name must be less than 64 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!phoneNumber || !validateForm()) return;

    try {
      await onSave(phoneNumber.id, { 
        friendlyName: friendlyName.trim() 
      });
      onClose();
    } catch (error) {
      console.error('Error saving phone number:', error);
      // Error handling is done in parent component
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !phoneNumber) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <Phone className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Edit Phone Number</h2>
              <p className="text-sm text-gray-500">{phoneNumber.number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSaving}
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Phone Number Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Number:</span>
                <p className="font-medium text-gray-900">{phoneNumber.number}</p>
              </div>
              <div>
                <span className="text-gray-500">Region:</span>
                <p className="font-medium text-gray-900">{phoneNumber.region}</p>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className={`inline-flex px-2 py-1 text-xs rounded-md font-medium ${
                  phoneNumber.status === 'active' 
                    ? 'bg-green-100 text-green-700'
                    : phoneNumber.status === 'inactive'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {phoneNumber.status.charAt(0).toUpperCase() + phoneNumber.status.slice(1)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Monthly Fee:</span>
                <p className="font-medium text-gray-900">${phoneNumber.monthlyFee.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Friendly Name Field */}
          <div>
            <label htmlFor="friendlyName" className="block text-sm font-medium text-gray-700 mb-2">
              Friendly Name *
            </label>
            <input
              type="text"
              id="friendlyName"
              value={friendlyName}
              onChange={(e) => {
                setFriendlyName(e.target.value);
                if (errors.friendlyName) {
                  setErrors({ ...errors, friendlyName: undefined });
                }
              }}
              onKeyDown={handleKeyDown}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.friendlyName
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="Enter a friendly name for this number"
              disabled={isSaving}
              autoFocus
            />
            {errors.friendlyName && (
              <p className="mt-1 text-sm text-red-600">{errors.friendlyName}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              This name helps you identify the purpose of this phone number (e.g., "Customer Support", "Sales Line")
            </p>
          </div>

          {/* Capabilities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capabilities
            </label>
            <div className="flex flex-wrap gap-2">
              {phoneNumber.capabilities.map(capability => (
                <span 
                  key={capability} 
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium"
                >
                  {capability.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !friendlyName.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}