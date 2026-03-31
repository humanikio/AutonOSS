'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, Loader2 } from 'lucide-react';
import { phoneNumberService, Country, PhoneNumberSearchParams } from '@/services/phoneNumberService';

interface PhoneNumberSearchProps {
  onSearchResults: (results: any[]) => void;
  onSearching: (isSearching: boolean) => void;
}

export default function PhoneNumberSearch({ onSearchResults, onSearching }: PhoneNumberSearchProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('US');
  const [numberType, setNumberType] = useState<'local' | 'tollFree' | 'mobile'>('local');
  const [areaCode, setAreaCode] = useState('');
  const [contains, setContains] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [excludeAddressRequired, setExcludeAddressRequired] = useState(false);
  
  // Capability filters - Default Voice and SMS enabled
  const [requireVoice, setRequireVoice] = useState(true);
  const [requireSMS, setRequireSMS] = useState(true);
  const [requireMMS, setRequireMMS] = useState(false);
  const [requireFax, setRequireFax] = useState(false);

  // Load available countries on mount
  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      const countriesData = await phoneNumberService.getAvailableCountries();
      setCountries(countriesData);
    } catch (error) {
      console.error('Failed to load countries:', error);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const handleSearch = async () => {
    onSearching(true);
    
    const searchParams: PhoneNumberSearchParams = {
      countryCode: selectedCountry,
      numberType,
      limit: 50,
    };

    // Add optional parameters
    if (areaCode) searchParams.areaCode = areaCode;
    if (contains) searchParams.contains = contains;
    if (state) searchParams.inRegion = state;
    if (city) searchParams.inLocality = city;
    if (excludeAddressRequired) {
      searchParams.excludeAllAddressRequired = true;
    }

    // Add capability filters
    if (requireVoice) searchParams.voiceEnabled = true;
    if (requireSMS) searchParams.smsEnabled = true;
    if (requireMMS) searchParams.mmsEnabled = true;
    if (requireFax) searchParams.faxEnabled = true;

    try {
      console.log('Search params being sent:', JSON.stringify(searchParams, null, 2));
      const results = await phoneNumberService.searchAvailableNumbers(searchParams);
      console.log('Search results received count:', results.length);
      console.log('First result full data:', JSON.stringify(results[0], null, 2));
      console.log('First result capabilities detailed:', results[0]?.capabilities);
      
      // Check all results capabilities
      results.forEach((result, index) => {
        console.log(`Result ${index + 1} capabilities:`, result.capabilities);
      });
      
      onSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      onSearchResults([]);
    } finally {
      onSearching(false);
    }
  };

  const getAvailableNumberTypes = () => {
    const country = countries.find(c => c.countryCode === selectedCountry);
    if (!country) return [];

    const types = [];
    if (country.subresourceUris.local) types.push({ value: 'local', label: 'Local' });
    if (country.subresourceUris.tollFree) types.push({ value: 'tollFree', label: 'Toll-Free' });
    if (country.subresourceUris.mobile) types.push({ value: 'mobile', label: 'Mobile' });
    
    return types;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Search for Phone Numbers</h3>
      
      <div className="space-y-4">
        {/* Country and Number Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              disabled={isLoadingCountries}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {isLoadingCountries ? (
                <option>Loading countries...</option>
              ) : (
                countries.map((country) => (
                  <option key={country.countryCode} value={country.countryCode}>
                    {country.country} ({country.countryCode})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number Type
            </label>
            <select
              value={numberType}
              onChange={(e) => setNumberType(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {getAvailableNumberTypes().map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Basic Search Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Area Code (optional)
            </label>
            <input
              type="text"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
              placeholder="e.g., 415"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contains Pattern (optional)
            </label>
            <input
              type="text"
              value={contains}
              onChange={(e) => setContains(e.target.value)}
              placeholder="e.g., 1234"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Required Capabilities - Always Visible */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Required Capabilities
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requireVoice"
                checked={requireVoice}
                onChange={(e) => setRequireVoice(e.target.checked)}
                className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <label htmlFor="requireVoice" className="text-sm text-gray-700">
                Voice Calls
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requireSMS"
                checked={requireSMS}
                onChange={(e) => setRequireSMS(e.target.checked)}
                className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <label htmlFor="requireSMS" className="text-sm text-gray-700">
                SMS
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requireMMS"
                checked={requireMMS}
                onChange={(e) => setRequireMMS(e.target.checked)}
                className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <label htmlFor="requireMMS" className="text-sm text-gray-700">
                MMS
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requireFax"
                checked={requireFax}
                onChange={(e) => setRequireFax(e.target.checked)}
                className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <label htmlFor="requireFax" className="text-sm text-gray-700">
                Fax
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Select capabilities that the phone number must support. Numbers without these capabilities will be filtered out.
          </p>
        </div>

        {/* Advanced Filters Toggle */}
        <div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Filter className="h-4 w-4" />
            Advanced Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-4 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Region (optional)
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g., California or CA"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City (optional)
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., San Francisco"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="excludeAddress"
                checked={excludeAddressRequired}
                onChange={(e) => setExcludeAddressRequired(e.target.checked)}
                className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <label htmlFor="excludeAddress" className="text-sm text-gray-700">
                Exclude numbers requiring address verification
              </label>
            </div>
          </div>
        )}

        {/* Search Button */}
        <div className="pt-4">
          <button
            onClick={handleSearch}
            disabled={isLoadingCountries}
            className="w-full md:w-auto px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Search className="h-5 w-5" />
            Search Available Numbers
          </button>
        </div>
      </div>
    </div>
  );
}