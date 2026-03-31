'use client';

import { LogOut, User, Edit3, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPermissions } from '@/lib/utils/roleUtils';
import { useState, useRef, useEffect } from 'react';
import { storage } from '@/lib/firebase/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import AvatarCreationModal from '../avatarCreation/avatarCreationModal';
import { COMMON_TIMEZONES, getTimezoneDisplay } from '@/lib/utils/timezone';

interface AccountSettingsProps {
  profileData: {
    firstName: string;
    lastName: string;
    phone: string;
    companyName: string;
    timezone: string;
  };
  handleProfileChange: (field: string, value: string) => void;
  successMessage: string;
  errorMessage: string;
}

export default function AccountSettings({ 
  profileData, 
  handleProfileChange, 
  successMessage, 
  errorMessage 
}: AccountSettingsProps) {
  const { user, tenant, logout } = useAuth();
  const permissions = getUserPermissions(user, tenant);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load avatar URL on mount
  useEffect(() => {
    if (user?.avatarUrl) {
      setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  // Listen for custom upload event from modal
  useEffect(() => {
    const handleTriggerUpload = () => {
      fileInputRef.current?.click();
    };

    window.addEventListener('triggerUpload', handleTriggerUpload);
    return () => window.removeEventListener('triggerUpload', handleTriggerUpload);
  }, []);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setAvatarError('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image size must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    setAvatarError('');

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `avatar_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `users/${user.uid}/avatar/${fileName}`);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // Update the avatar URL in the parent component
      // This will trigger the save to update the user document
      setAvatarUrl(downloadUrl);
      handleProfileChange('avatarUrl', downloadUrl);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      setAvatarError('Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl || !user?.uid) return;

    setUploadingAvatar(true);
    setAvatarError('');

    try {
      // Extract the file path from the URL
      const urlParts = avatarUrl.split('/o/')[1];
      if (urlParts) {
        const filePath = decodeURIComponent(urlParts.split('?')[0]);
        const fileRef = ref(storage, filePath);
        
        // Delete the file from storage
        await deleteObject(fileRef).catch(() => {
          // File might not exist, continue anyway
          console.log('File not found in storage, continuing...');
        });
      }

      // Clear the avatar
      setAvatarUrl(null);
      handleProfileChange('avatarUrl', '');

    } catch (error) {
      console.error('Error removing avatar:', error);
      setAvatarError('Failed to remove avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarFromModal = async (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
    handleProfileChange('avatarUrl', newAvatarUrl);
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
        
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-green-700">{successMessage}</div>
          </div>
        )}
        
        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-red-700">{errorMessage}</div>
          </div>
        )}

        <div className="flex items-start gap-6 mb-6">
          {/* Avatar Upload Section */}
          <div className="flex-shrink-0">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center border-2 border-primary-200">
                  <User className="h-10 w-10 text-primary-600" />
                </div>
              )}
              
              {/* Edit button */}
              <div className="absolute -bottom-1 -right-1">
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={uploadingAvatar}
                  className="p-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-full shadow-lg disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                  title="Update avatar"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            
            {/* Upload status */}
            {uploadingAvatar && (
              <p className="text-xs text-gray-500 mt-2">Uploading...</p>
            )}
            {avatarError && (
              <p className="text-xs text-red-600 mt-2">{avatarError}</p>
            )}
          </div>
          
          {/* Profile fields */}
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input 
                  type="text" 
                  className="input" 
                  value={profileData.firstName}
                  onChange={(e) => handleProfileChange('firstName', e.target.value)}
                />
              </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input 
              type="text" 
              className="input" 
              value={profileData.lastName}
              onChange={(e) => handleProfileChange('lastName', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input type="email" className="input" defaultValue={user?.email || ''} readOnly />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
              {!permissions.canEditCompanySettings && (
                <span className="text-xs text-gray-500 ml-2">(Admin only)</span>
              )}
            </label>
            <input 
              type="text" 
              className={`input ${!permissions.canEditCompanySettings ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              value={profileData.companyName}
              onChange={(e) => handleProfileChange('companyName', e.target.value)}
              readOnly={!permissions.canEditCompanySettings}
              disabled={!permissions.canEditCompanySettings}
            />
          </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input 
              type="tel" 
              className="input" 
              value={profileData.phone}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Zone
            </label>
            <select
              className="input"
              value={profileData.timezone}
              onChange={(e) => handleProfileChange('timezone', e.target.value)}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Currently: {getTimezoneDisplay(profileData.timezone || 'UTC')}
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Sign Out</p>
              <p className="text-sm text-gray-500">Sign out of your account on this device</p>
            </div>
            <button 
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Avatar Creation Modal */}
      <AvatarCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAvatarUpdate={handleAvatarFromModal}
        currentAvatarUrl={avatarUrl}
      />
    </div>
  );
}