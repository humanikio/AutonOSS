'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { 
  Shield, 
  Key,
  Smartphone,
  Settings,
  Bell,
  Zap,
  CreditCard,
  Users,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';
import TotpEnrollmentModal from '@/components/TotpEnrollmentModal';
import TotpVerificationModal from '@/components/TotpVerificationModal';
import BackupCodesModal from '@/components/BackupCodesModal';
import SmsOtpSetupModal from '@/components/SmsOtpSetupModal';
import { totpService } from '@/services/totpService';
import { smsOtpService } from '@/services/smsOtpService';

export default function SecurityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('password');
  
  // Password reset state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 2FA state
  const [totpStatus, setTotpStatus] = useState({
    enabled: false,
    enrolledAt: null as string | null,
    backupCodesRemaining: 0,
    loading: true
  });
  const [enrollmentModal, setEnrollmentModal] = useState(false);
  const [verificationModal, setVerificationModal] = useState({
    open: false,
    action: '' as 'disable' | 'regenerate'
  });
  const [backupCodesModal, setBackupCodesModal] = useState({
    open: false,
    codes: [] as string[]
  });
  const [totp2faLoading, setTotp2faLoading] = useState(false);

  // SMS OTP state
  const [smsOtpStatus, setSmsOtpStatus] = useState({
    enabled: false,
    phoneNumber: null as string | null,
    enrolledAt: null as string | null,
    loading: true
  });
  const [smsOtpSetupModal, setSmsOtpSetupModal] = useState(false);
  const [smsOtp2faLoading, setSmsOtp2faLoading] = useState(false);

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear messages when user starts typing
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const validatePasswords = () => {
    if (!passwordData.currentPassword) {
      setErrorMessage('Current password is required');
      return false;
    }
    if (!passwordData.newPassword) {
      setErrorMessage('New password is required');
      return false;
    }
    if (passwordData.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters');
      return false;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return false;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      setErrorMessage('New password must be different from current password');
      return false;
    }
    return true;
  };

  const updateUserPassword = async () => {
    if (!validatePasswords()) return;
    if (!auth.currentUser || !user?.email) {
      setErrorMessage('User not authenticated');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Create credential for reauthentication
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );

      // Reauthenticate the user
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, passwordData.newPassword);

      // Success
      setSuccessMessage('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (error: any) {
      console.error('Password update failed:', error);
      
      // Handle specific Firebase errors
      switch (error.code) {
        case 'auth/wrong-password':
          setErrorMessage('Current password is incorrect');
          break;
        case 'auth/weak-password':
          setErrorMessage('New password is too weak');
          break;
        case 'auth/requires-recent-login':
          setErrorMessage('Please log out and log back in before changing your password');
          break;
        default:
          setErrorMessage('Failed to update password. Please try again.');
      }
      
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Load TOTP and SMS OTP status on component mount
  useEffect(() => {
    loadTotpStatus();
    loadSmsOtpStatus();
  }, []);

  const loadTotpStatus = async () => {
    try {
      const result = await totpService.getStatus();
      if (result.success && result.data) {
        setTotpStatus({
          enabled: result.data.enabled,
          enrolledAt: result.data.enrolledAt || null,
          backupCodesRemaining: result.data.backupCodesRemaining,
          loading: false
        });
      } else {
        setTotpStatus(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error loading TOTP status:', error);
      setTotpStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const loadSmsOtpStatus = async () => {
    try {
      const result = await smsOtpService.getStatus();
      if (result.success && result.data) {
        setSmsOtpStatus({
          enabled: result.data.enabled,
          phoneNumber: result.data.phoneNumber || null,
          enrolledAt: result.data.enrolledAt || null,
          loading: false
        });
      } else {
        setSmsOtpStatus(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error loading SMS OTP status:', error);
      setSmsOtpStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const handleEnableTotp = () => {
    if (!user?.email) {
      setErrorMessage('User email is required to enable 2FA');
      return;
    }
    setEnrollmentModal(true);
  };

  const handleEnrollmentComplete = (backupCodes: string[]) => {
    setTotpStatus(prev => ({
      ...prev,
      enabled: true,
      enrolledAt: new Date().toISOString(),
      backupCodesRemaining: backupCodes.length
    }));
    setSuccessMessage('Two-factor authentication enabled successfully!');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleDisableTotp = () => {
    setVerificationModal({
      open: true,
      action: 'disable'
    });
  };

  const handleRegenerateBackupCodes = () => {
    setVerificationModal({
      open: true,
      action: 'regenerate'
    });
  };

  const handleVerificationComplete = async () => {
    if (verificationModal.action === 'disable') {
      setTotpStatus(prev => ({
        ...prev,
        enabled: false,
        enrolledAt: null,
        backupCodesRemaining: 0
      }));
      setSuccessMessage('Two-factor authentication disabled successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  const handleDisableVerified = async (code: string) => {
    setTotp2faLoading(true);
    try {
      const result = await totpService.disable(code);
      if (result.success) {
        setTotpStatus(prev => ({
          ...prev,
          enabled: false,
          enrolledAt: null,
          backupCodesRemaining: 0
        }));
        setSuccessMessage('Two-factor authentication disabled successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
        return true;
      } else {
        setErrorMessage(result.error || 'Failed to disable 2FA');
        return false;
      }
    } catch (error) {
      setErrorMessage('Failed to disable 2FA');
      return false;
    } finally {
      setTotp2faLoading(false);
    }
  };

  const handleRegenerateVerified = async (code: string) => {
    setTotp2faLoading(true);
    try {
      const result = await totpService.regenerateBackupCodes(code);
      if (result.success && result.data) {
        setBackupCodesModal({
          open: true,
          codes: result.data?.backupCodes || []
        });
        setTotpStatus(prev => ({
          ...prev,
          backupCodesRemaining: result.data?.backupCodes?.length || 0
        }));
        setSuccessMessage('Backup codes regenerated successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
        return true;
      } else {
        setErrorMessage(result.error || 'Failed to regenerate backup codes');
        return false;
      }
    } catch (error) {
      setErrorMessage('Failed to regenerate backup codes');
      return false;
    } finally {
      setTotp2faLoading(false);
    }
  };

  // SMS OTP handlers
  const handleEnableSmsOtp = () => {
    setSmsOtpSetupModal(true);
  };

  const handleSmsOtpSetupComplete = () => {
    setSmsOtpStatus(prev => ({
      ...prev,
      enabled: true,
      enrolledAt: new Date().toISOString()
    }));
    setSuccessMessage('SMS two-factor authentication enabled successfully!');
    setTimeout(() => setSuccessMessage(''), 5000);
    // Reload status to get actual data
    loadSmsOtpStatus();
  };

  const handleDisableSmsOtp = async () => {
    // TODO: Implement SMS OTP disable functionality
    setSmsOtp2faLoading(true);
    try {
      // For now, just update the UI
      setSmsOtpStatus(prev => ({
        ...prev,
        enabled: false,
        phoneNumber: null,
        enrolledAt: null
      }));
      setSuccessMessage('SMS two-factor authentication disabled successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setErrorMessage('Failed to disable SMS 2FA');
    } finally {
      setSmsOtp2faLoading(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: Users },
    { id: 'emails', label: 'Email Accounts', icon: Mail },
    { id: 'phoneNumbers', label: 'Phone Numbers', icon: Phone },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard }
  ];

  const securityTabs = [
    { id: 'password', label: 'Password', icon: Key },
    { id: '2fa', label: 'Two-Factor Authentication', icon: Smartphone }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900">Security Settings</h1>
          <p className="mt-2 text-gray-500">Manage your password and security preferences</p>
        </div>

        <div className="flex gap-6 h-[calc(100vh-12rem)] overflow-hidden">
          {/* Settings Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1 sticky top-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'phoneNumbers') {
                        router.push('/settings/phoneNumbers');
                      } else if (tab.id === 'emails') {
                        router.push('/settings/emails');
                      } else if (tab.id === 'billing') {
                        router.push('/settings/billing');
                      } else if (tab.id === 'security') {
                        router.push('/settings/security');
                      } else {
                        router.push('/settings');
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      tab.id === 'security'
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
            {/* Security Sub-tabs */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {securityTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                          activeTab === tab.id
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Change Password</h2>
                
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

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input 
                      type="password" 
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      disabled={isLoading}
                      placeholder="Enter your current password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input 
                      type="password" 
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      disabled={isLoading}
                      placeholder="Enter your new password (minimum 6 characters)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input 
                      type="password" 
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      disabled={isLoading}
                      placeholder="Confirm your new password"
                    />
                  </div>
                  <button 
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={updateUserPassword}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}

            {/* 2FA Tab */}
            {activeTab === '2fa' && (
              <div className="space-y-6">
                {/* TOTP Status Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Authenticator App (TOTP)</h2>
                  
                  {totpStatus.loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <span className="ml-3 text-gray-600">Loading 2FA status...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            totpStatus.enabled ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {totpStatus.enabled ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              Two-Factor Authentication
                            </p>
                            <p className="text-sm text-gray-500">
                              {totpStatus.enabled 
                                ? `Enabled ${totpStatus.enrolledAt ? new Date(totpStatus.enrolledAt).toLocaleDateString() : ''}`
                                : 'Add an extra layer of security to your account'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          {totpStatus.enabled ? (
                            <button
                              onClick={handleDisableTotp}
                              disabled={totp2faLoading}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {totp2faLoading ? 'Processing...' : 'Disable'}
                            </button>
                          ) : (
                            <button
                              onClick={handleEnableTotp}
                              disabled={totp2faLoading}
                              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                            >
                              {totp2faLoading ? 'Processing...' : 'Enable'}
                            </button>
                          )}
                        </div>
                      </div>

                      {totpStatus.enabled && (
                        <div className="pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">Backup Codes</p>
                              <p className="text-sm text-gray-500">
                                {totpStatus.backupCodesRemaining} backup codes remaining
                              </p>
                            </div>
                            <button
                              onClick={handleRegenerateBackupCodes}
                              disabled={totp2faLoading}
                              className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
                            >
                              {totp2faLoading ? 'Processing...' : 'Regenerate Codes'}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-700">
                            <p className="font-medium mb-1">About Two-Factor Authentication</p>
                            <p>
                              2FA adds an extra layer of security by requiring a code from your authenticator app 
                              (Google Authenticator, Authy, 1Password, etc.) in addition to your password when signing in.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SMS OTP Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">SMS Two-Factor Authentication</h2>
                  
                  {smsOtpStatus.loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading SMS 2FA status...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            smsOtpStatus.enabled ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {smsOtpStatus.enabled ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              SMS Two-Factor Authentication
                            </p>
                            <p className="text-sm text-gray-500">
                              {smsOtpStatus.enabled 
                                ? `Enabled ${smsOtpStatus.enrolledAt ? new Date(smsOtpStatus.enrolledAt).toLocaleDateString() : ''}${smsOtpStatus.phoneNumber ? ` • ${smsOtpStatus.phoneNumber}` : ''}`
                                : 'Receive security codes via text message'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          {smsOtpStatus.enabled ? (
                            <button
                              onClick={handleDisableSmsOtp}
                              disabled={smsOtp2faLoading}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {smsOtp2faLoading ? 'Processing...' : 'Disable'}
                            </button>
                          ) : (
                            <button
                              onClick={handleEnableSmsOtp}
                              disabled={smsOtp2faLoading}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              {smsOtp2faLoading ? 'Processing...' : 'Enable'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Phone className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-amber-700">
                            <p className="font-medium mb-1">About SMS Two-Factor Authentication</p>
                            <p>
                              SMS 2FA sends verification codes to your mobile phone via text message. 
                              While convenient, authenticator apps are generally more secure than SMS.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOTP Enrollment Modal */}
      <TotpEnrollmentModal
        isOpen={enrollmentModal}
        onClose={() => setEnrollmentModal(false)}
        onEnrollmentComplete={handleEnrollmentComplete}
        userEmail={user?.email || ''}
      />

      {/* TOTP Verification Modal */}
      <TotpVerificationModal
        isOpen={verificationModal.open}
        onClose={() => setVerificationModal({ open: false, action: 'disable' })}
        onVerified={async () => {
          // This will be called by a custom verification modal that handles the specific actions
          const mockInput = document.createElement('input');
          // We need a custom implementation that captures the code and calls the right handler
          return true;
        }}
        title={verificationModal.action === 'disable' ? 'Disable Two-Factor Authentication' : 'Regenerate Backup Codes'}
        description={verificationModal.action === 'disable' 
          ? 'Enter your verification code to disable 2FA'
          : 'Enter your verification code to regenerate backup codes'
        }
      />

      {/* Custom Verification Handler */}
      {verificationModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {verificationModal.action === 'disable' ? 'Disable Two-Factor Authentication' : 'Regenerate Backup Codes'}
              </h3>
              <button
                onClick={() => setVerificationModal({ open: false, action: 'disable' })}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <div className="p-3 bg-primary-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary-600" />
                </div>
                <p className="text-sm text-gray-500">
                  {verificationModal.action === 'disable' 
                    ? 'Enter your verification code to disable 2FA'
                    : 'Enter your verification code to regenerate backup codes'
                  }
                </p>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700">{errorMessage}</div>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const code = formData.get('code') as string;
                
                let success = false;
                if (verificationModal.action === 'disable') {
                  success = await handleDisableVerified(code);
                } else {
                  success = await handleRegenerateVerified(code);
                }
                
                if (success) {
                  setVerificationModal({ open: false, action: 'disable' });
                }
              }}>
                <input
                  type="text"
                  name="code"
                  placeholder="000000"
                  className="w-full px-3 py-2 text-center text-2xl tracking-widest border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  maxLength={6}
                  autoFocus
                  required
                />
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setVerificationModal({ open: false, action: 'disable' })}
                    disabled={totp2faLoading}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={totp2faLoading}
                    className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {totp2faLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      <BackupCodesModal
        isOpen={backupCodesModal.open}
        onClose={() => setBackupCodesModal({ open: false, codes: [] })}
        backupCodes={backupCodesModal.codes}
        onRegenerate={handleRegenerateBackupCodes}
      />

      {/* SMS OTP Setup Modal */}
      <SmsOtpSetupModal
        isOpen={smsOtpSetupModal}
        onClose={() => setSmsOtpSetupModal(false)}
        onSetupComplete={handleSmsOtpSetupComplete}
      />
    </div>
  );
}