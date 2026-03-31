'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, Building2, Crown, CheckCircle2 } from 'lucide-react';

export default function TenantSwitcher() {
  const { 
    tenant, 
    availableTenants, 
    currentTenantId,
    switchTenant, 
    canAccessMainTenant,
    isOnMainTenant,
    user 
  } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTenantSwitch = async (tenantId: string) => {
    if (tenantId === currentTenantId || isLoading) return;
    
    setIsLoading(true);
    try {
      await switchTenant(tenantId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const getTenantDisplayInfo = (tenant: any) => {
    const isRoot = tenant.id === user?.tenantId;
    const isCurrent = tenant.id === currentTenantId;
    
    return {
      name: tenant.name,
      type: isRoot ? 'Main Account' : 'Subaccount',
      icon: isRoot ? Crown : Building2,
      iconColor: isRoot ? 'text-yellow-600' : 'text-blue-600',
      isRoot,
      isCurrent
    };
  };

  // Always show clickable switcher - even with one tenant it's useful for context
  if (!tenant) {
    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
        <div className="text-sm font-medium text-gray-800 truncate">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isOpen ? 'bg-gray-100 border-gray-300' : ''}`}
        disabled={isLoading}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-800 truncate">
            {tenant.name}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {isOnMainTenant ? 'Main' : 'Sub'}
            </span>
            <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`} />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-2">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
            Switch Account ({availableTenants.length})
          </div>
          
          <div className="py-1">
            {availableTenants.map((t) => {
              const displayInfo = getTenantDisplayInfo(t);
              const IconComponent = displayInfo.icon;
              
              return (
                <button
                  key={t.id}
                  onClick={() => handleTenantSwitch(t.id)}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    displayInfo.isCurrent
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <IconComponent className={`h-4 w-4 ${displayInfo.iconColor}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {displayInfo.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {displayInfo.type}
                    </div>
                  </div>
                  
                  {displayInfo.isCurrent && (
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">
            {isOnMainTenant ? 'On main account' : 'On subaccount'}
          </div>
        </div>
      )}
    </div>
  );
}