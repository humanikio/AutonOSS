'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Phone, 
  Search, 
  Filter, 
  ShoppingCart, 
  Settings, 
  ExternalLink,
  Edit2,
  MapPin,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import PhoneNumberSearch from './components/PhoneNumberSearch';
import AvailableNumberCard from './components/AvailableNumberCard';
import PhoneNumberPricingModal from './components/PhoneNumberPricingModal';
import EditPhoneNumberModal from './components/EditPhoneNumberModal';
import { AvailablePhoneNumber, phoneNumberService } from '@/services/phoneNumberService';

// Type definitions for purchased numbers from Firestore
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
  purchasedAt: string;
  createdAt: string;
}

// Legacy interface for compatibility
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

export default function PhoneNumbersManagement() {
  const router = useRouter();
  const { user, tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'manage' | 'buy'>('manage');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [managedNumbers, setManagedNumbers] = useState<PhoneNumber[]>([]);
  const [purchasedNumbers, setPurchasedNumbers] = useState<PurchasedPhoneNumber[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNumbers, setIsLoadingNumbers] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<AvailablePhoneNumber | null>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<PhoneNumber | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Load purchased numbers when component mounts or tenant changes
  useEffect(() => {
    if (tenant?.id) {
      loadPurchasedNumbers();
    }
  }, [tenant?.id]);

  // Handle purchase success/cancellation from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const purchaseStatus = urlParams.get('purchase');
    const sessionId = urlParams.get('session_id');

    if (purchaseStatus === 'success' && sessionId) {
      alert('Phone number purchased successfully! It may take a few minutes to appear in your account.');
      // Clean up URL
      window.history.replaceState({}, '', '/settings/phoneNumbers');
      setActiveTab('manage');
      // Reload purchased numbers to show the new one
      loadPurchasedNumbers();
    } else if (purchaseStatus === 'cancelled') {
      alert('Purchase was cancelled.');
      // Clean up URL
      window.history.replaceState({}, '', '/settings/phoneNumbers');
    }
  }, []);

  // Function to load purchased numbers from the new Firestore collection
  const loadPurchasedNumbers = async () => {
    if (!tenant?.id) return;
    
    setIsLoadingNumbers(true);
    try {
      console.log('Loading purchased numbers for tenant:', tenant.id);
      const numbers = await phoneNumberService.getPurchasedNumbers();
      console.log('Fetched purchased numbers:', numbers);
      setPurchasedNumbers(numbers);
      
      // Convert to legacy format for compatibility with existing UI
      const legacyNumbers: PhoneNumber[] = numbers.map(num => ({
        id: num.twilioSid,
        number: num.phoneNumber,
        friendlyName: num.friendlyName,
        region: `${num.countryCode} ${num.numberType}`,
        countryCode: num.countryCode,
        provider: 'auton' as const,
        status: num.status as 'active' | 'inactive' | 'pending',
        capabilities: Object.entries(num.capabilities)
          .filter(([_, enabled]) => enabled)
          .map(([capability, _]) => capability),
        monthlyFee: 1.15, // Default monthly fee, could be made dynamic
        connectedAt: num.purchasedAt,
        lastUsed: undefined
      }));
      
      setManagedNumbers(legacyNumbers);
    } catch (error) {
      console.error('Error loading purchased numbers:', error);
      // Don't show alert for API errors, just log them
    } finally {
      setIsLoadingNumbers(false);
    }
  };

  // Filter managed numbers
  const filteredManagedNumbers = managedNumbers.filter(number => {
    const matchesSearch = searchQuery === '' || 
      number.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      number.friendlyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      number.region.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRegion = selectedRegion === 'all' || 
      number.region.toLowerCase().includes(selectedRegion.toLowerCase());
    
    return matchesSearch && matchesRegion;
  });

  // Handle search results
  const handleSearchResults = (results: AvailablePhoneNumber[]) => {
    setAvailableNumbers(results);
  };

  const handleViewDetails = (number: AvailablePhoneNumber) => {
    setSelectedNumber(number);
    setIsPricingModalOpen(true);
  };

  const handleClosePricingModal = () => {
    setIsPricingModalOpen(false);
    setSelectedNumber(null);
  };

  const handlePurchaseFromModal = async (number: AvailablePhoneNumber, pricingData: any) => {
    setIsPurchasing(true);
    
    try {
      // Determine number type from capabilities or default to local
      let numberType = 'local';
      if (number.phoneNumber.includes('toll') || number.phoneNumber.includes('800')) {
        numberType = 'tollFree';
      }

      // Phone number purchasing requires a payment integration (e.g. Stripe).
      // See README for setup instructions.
      alert('Phone number purchasing requires a payment integration to be configured. See README for setup instructions.');
      setIsPurchasing(false);
      return;

    } catch (error) {
      console.error('Error purchasing phone number:', error);
      setIsPurchasing(false);
      
      // Show error message to user
      alert(`Failed to purchase phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleConnectTwilioNumber = () => {
    // This would open a modal or form to connect existing Twilio numbers
    console.log('Connect Twilio number');
  };

  const handleOpenEditModal = (number: PhoneNumber) => {
    setEditingNumber(number);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingNumber(null);
  };

  const handleSavePhoneNumber = async (numberId: string, updatedData: { friendlyName: string }) => {
    setIsSavingEdit(true);
    try {
      // TODO: Add API call to update friendly name in backend
      console.log('Updating friendly name for', numberId, 'to', updatedData.friendlyName);
      
      // Update local state
      setManagedNumbers(prev => 
        prev.map(num => 
          num.id === numberId 
            ? { ...num, friendlyName: updatedData.friendlyName }
            : num
        )
      );
      
      // Update purchased numbers state too
      setPurchasedNumbers(prev =>
        prev.map(num =>
          num.twilioSid === numberId
            ? { ...num, friendlyName: updatedData.friendlyName }
            : num
        )
      );

    } catch (error) {
      console.error('Error updating friendly name:', error);
      throw new Error('Failed to update friendly name');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'auton': return 'bg-blue-100 text-blue-700';
      case 'twilio': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Back to Settings</span>
            </button>
          </div>
          <h1 className="text-3xl font-light text-gray-900">Phone Numbers</h1>
          <p className="mt-2 text-gray-500">Manage your phone numbers and purchase new ones</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'manage'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Manage Numbers ({isLoadingNumbers ? '...' : managedNumbers.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('buy')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'buy'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Buy Numbers
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Filters for Manage Tab Only */}
        {activeTab === 'manage' && (
          <div className="mb-6 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your numbers..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 bg-white border rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                  showFilters ? 'border-primary-500 text-primary-600' : 'border-gray-200 text-gray-700'
                }`}
              >
                <Filter className="h-5 w-5" />
                Filters
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Region</label>
                  <select 
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-48 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Regions</option>
                    <option value="new york">New York</option>
                    <option value="california">California</option>
                    <option value="florida">Florida</option>
                    <option value="illinois">Illinois</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manage Numbers Tab */}
        {activeTab === 'manage' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Your Phone Numbers</h2>
                <p className="text-sm text-gray-500">Manage your existing phone numbers and connections</p>
              </div>
              <button
                onClick={handleConnectTwilioNumber}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Connect Twilio Number
              </button>
            </div>

            {/* Loading State */}
            {isLoadingNumbers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <span className="ml-3 text-gray-600">Loading your phone numbers...</span>
              </div>
            ) : (
              <>
                {/* Numbers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredManagedNumbers.map(number => (
                <div
                  key={number.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-50 rounded-lg">
                        <Phone className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{number.friendlyName}</h3>
                        <p className="text-sm text-gray-500">{number.number}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleOpenEditModal(number)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit phone number"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{number.region}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs rounded-md font-medium ${getStatusColor(number.status)}`}>
                        {number.status.charAt(0).toUpperCase() + number.status.slice(1)}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-md font-medium ${getProviderColor(number.provider)}`}>
                        {number.provider.charAt(0).toUpperCase() + number.provider.slice(1)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {number.capabilities.map(capability => (
                        <span key={capability} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {capability}
                        </span>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Monthly: ${number.monthlyFee.toFixed(2)}</span>
                        <span>Added: {new Date(number.connectedAt).toLocaleDateString()}</span>
                      </div>
                      {number.lastUsed && (
                        <div className="mt-1 text-xs text-gray-400">
                          Last used: {new Date(number.lastUsed).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
                </div>

                {/* Empty State for Manage */}
                {filteredManagedNumbers.length === 0 && (
                  <div className="text-center py-12">
                    <Phone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No phone numbers found</p>
                    <button
                      onClick={() => setActiveTab('buy')}
                      className="mt-4 text-sm text-primary-600 hover:text-primary-700"
                    >
                      Buy your first number
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Buy Numbers Tab */}
        {activeTab === 'buy' && (
          <div className="space-y-6">
            {/* Search Component */}
            <PhoneNumberSearch 
              onSearchResults={handleSearchResults}
              onSearching={setIsSearching}
            />

            {/* Search Results */}
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <span className="ml-3 text-gray-600">Searching for available numbers...</span>
              </div>
            ) : availableNumbers.length > 0 ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {availableNumbers.length} Available Numbers
                  </h3>
                  <p className="text-sm text-gray-500">Select a number to purchase</p>
                </div>
                
                {/* Available Numbers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableNumbers.map(number => (
                    <AvailableNumberCard
                      key={number.phoneNumber}
                      number={number}
                      onViewDetails={handleViewDetails}
                      isLoading={isPurchasing}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Phone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Search for available phone numbers to get started</p>
              </div>
            )}
          </div>
        )}

        {/* Pricing Modal */}
        {selectedNumber && (
          <PhoneNumberPricingModal
            number={selectedNumber}
            isOpen={isPricingModalOpen}
            onClose={handleClosePricingModal}
            onPurchase={handlePurchaseFromModal}
          />
        )}

        {/* Edit Phone Number Modal */}
        <EditPhoneNumberModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          phoneNumber={editingNumber}
          onSave={handleSavePhoneNumber}
          isSaving={isSavingEdit}
        />
      </div>
    </div>
  );
}