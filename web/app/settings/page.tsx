'use client';

import {
  Save,
  Shield,
  Users,
  Phone,
  Mail,
  UserCog,
  Zap,
  Tag,
  Tags,
  Globe
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import AccountSettings from './components/AccountSettings';
import SecuritySettings from './components/SecuritySettings';
import { getUserPermissions } from '@/lib/utils/roleUtils';
import { detectUserTimezone, getTimezoneDisplay, COMMON_TIMEZONES } from '@/lib/utils/timezone';

export default function Settings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { user, tenant } = useAuth();
  const permissions = getUserPermissions(user, tenant);

  // Profile form state - now reads from user document
  const [profileData, setProfileData] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    phone: '',
    companyName: tenant?.name || '',
    avatarUrl: user?.avatarUrl || '',
    timezone: user?.timezone || detectUserTimezone()
  });

  // Update profile data when user or tenant changes
  useEffect(() => {
    if (user && tenant) {
      const nameParts = user.name?.split(' ') || [''];
      setProfileData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: '',
        companyName: tenant.name || '',
        avatarUrl: user.avatarUrl || '',
        timezone: user.timezone || detectUserTimezone()
      });
    }
  }, [user, tenant]);

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveProfile = async () => {
    if (!tenant?.id || !user?.uid) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();

      // Update user document with personal information (direct Firestore write)
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: fullName,
        'profile.phone': profileData.phone,
        avatarUrl: profileData.avatarUrl,
        timezone: profileData.timezone,
        updatedAt: new Date().toISOString()
      });

      // Update tenant document with company information
      const tenantRef = doc(db, 'tenants', tenant.id);
      await updateDoc(tenantRef, {
        name: profileData.companyName,
        updatedAt: new Date().toISOString()
      });

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage('Failed to update profile. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: Users },
    { id: 'users', label: 'Users & Teams', icon: UserCog },
    { id: 'emails', label: 'Email Accounts', icon: Mail },
    { id: 'phoneNumbers', label: 'Phone Numbers', icon: Phone },
    { id: 'domains', label: 'Domains', icon: Globe },
    { id: 'customFields', label: 'Custom Fields', icon: Tag },
    { id: 'tags', label: 'Contact Tags', icon: Tags },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your account preferences and system configuration
            </p>
          </div>
          <button 
            onClick={saveProfile}
            disabled={isLoading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-12rem)] overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1 sticky top-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isUsersTab = tab.id === 'users';
              const isDisabled = isUsersTab && !permissions.canAccessUsersSection;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (isDisabled) return;

                    if (tab.id === 'users') {
                      router.push('/settings/users');
                    } else if (tab.id === 'phoneNumbers') {
                      router.push('/settings/phoneNumbers');
                    } else if (tab.id === 'emails') {
                      router.push('/settings/emails');
                    } else if (tab.id === 'domains') {
                      router.push('/settings/domains');
                    } else if (tab.id === 'customFields') {
                      router.push('/settings/customFields');
                    } else if (tab.id === 'tags') {
                      router.push('/settings/tags');
                    } else if (tab.id === 'integrations') {
                      router.push('/settings/integrations');
                    } else if (tab.id === 'security') {
                      router.push('/settings/security');
                    } else {
                      setActiveTab(tab.id);
                    }
                  }}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isDisabled 
                      ? 'text-gray-400 cursor-not-allowed opacity-50' 
                      : activeTab === tab.id
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-2">
          {activeTab === 'account' && (
            <AccountSettings 
              profileData={profileData}
              handleProfileChange={handleProfileChange}
              successMessage={successMessage}
              errorMessage={errorMessage}
            />
          )}

          {activeTab === 'security' && <SecuritySettings />}

          {/* Billing is now handled by dedicated page */}
        </div>
      </div>
    </div>
  );
}