'use client';

import { useState, useEffect } from 'react';
import { X, Phone, Search, Check, Loader2 } from 'lucide-react';
import { phoneNumberService, AvailablePhoneNumber } from '@/services/phoneNumberService';
import PhoneNumberSearch from '@/app/settings/phoneNumbers/components/PhoneNumberSearch';
import AvailableNumberCard from '@/app/settings/phoneNumbers/components/AvailableNumberCard';

interface PhoneNumberBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNumber: (phoneNumber: string, twilioSid?: string) => void;
  selectedNumber?: string;
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

export default function PhoneNumberBrowserModal({
  isOpen,
  onClose,
  onSelectNumber,
  selectedNumber
}: PhoneNumberBrowserModalProps) {
  const [activeTab, setActiveTab] = useState<'owned' | 'buy'>('owned');
  const [purchasedNumbers, setPurchasedNumbers] = useState<PurchasedPhoneNumber[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [isLoadingPurchased, setIsLoadingPurchased] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPurchasedNumbers();
    }
  }, [isOpen]);

  const loadPurchasedNumbers = async () => {
    setIsLoadingPurchased(true);
    try {
      const numbers = await phoneNumberService.getPurchasedNumbers();
      setPurchasedNumbers(numbers);
    } catch (error) {
      console.error('Error loading purchased numbers:', error);
    } finally {
      setIsLoadingPurchased(false);
    }
  };

  const handleSearchResults = (results: AvailablePhoneNumber[]) => {
    setAvailableNumbers(results);
  };

  const handleSelectPurchasedNumber = (phoneNumber: string, twilioSid: string) => {
    onSelectNumber(phoneNumber, twilioSid);
    onClose();
  };

  const handlePurchaseNumber = async (number: AvailablePhoneNumber) => {
    setIsPurchasing(true);
    
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
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      alert(`Failed to purchase phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Select Phone Number</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="mt-4">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('owned')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'owned'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Your Numbers ({isLoadingPurchased ? '...' : purchasedNumbers.length})
                </button>
                <button
                  onClick={() => setActiveTab('buy')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'buy'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Buy New Number
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="bg-gray-50 px-6 py-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {activeTab === 'owned' && (
              <div>
                {isLoadingPurchased ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="ml-3 text-gray-600">Loading your numbers...</span>
                  </div>
                ) : purchasedNumbers.length > 0 ? (
                  <div className="space-y-3">
                    {purchasedNumbers.map((number) => (
                      <div
                        key={number.twilioSid}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedNumber === number.phoneNumber
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        onClick={() => handleSelectPurchasedNumber(number.phoneNumber, number.twilioSid)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                              <Phone className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{number.friendlyName}</p>
                              <p className="text-sm text-gray-500">{number.phoneNumber}</p>
                              <div className="flex gap-2 mt-1">
                                {Object.entries(number.capabilities)
                                  .filter(([_, enabled]) => enabled)
                                  .map(([capability]) => (
                                    <span key={capability} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                      {capability}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          </div>
                          {selectedNumber === number.phoneNumber && (
                            <Check className="h-5 w-5 text-indigo-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Phone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No phone numbers found</p>
                    <button
                      onClick={() => setActiveTab('buy')}
                      className="mt-4 text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Buy your first number
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'buy' && (
              <div className="space-y-6">
                <PhoneNumberSearch 
                  onSearchResults={handleSearchResults}
                  onSearching={setIsSearching}
                />

                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="ml-3 text-gray-600">Searching for available numbers...</span>
                  </div>
                ) : availableNumbers.length > 0 ? (
                  <div>
                    <div className="mb-4">
                      <h4 className="text-md font-medium text-gray-900">
                        {availableNumbers.length} Available Numbers
                      </h4>
                      <p className="text-sm text-gray-500">Purchase a number to use with this agent</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableNumbers.map(number => (
                        <div
                          key={number.phoneNumber}
                          className="bg-white border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-gray-900">{number.phoneNumber}</p>
                              <p className="text-sm text-gray-500">{number.locality}, {number.region}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mb-3">
                            {Object.entries(number.capabilities)
                              .filter(([_, enabled]) => enabled)
                              .map(([capability]) => (
                                <span key={capability} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                  {capability}
                                </span>
                              ))}
                          </div>
                          
                          <button
                            onClick={() => handlePurchaseNumber(number)}
                            disabled={isPurchasing}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {isPurchasing ? 'Processing...' : 'Purchase & Select'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Search for available phone numbers to get started</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}