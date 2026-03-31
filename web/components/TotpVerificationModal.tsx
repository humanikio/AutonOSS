'use client';

import { useState } from 'react';
import { X, AlertCircle, Shield } from 'lucide-react';

interface TotpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  title?: string;
  description?: string;
  showBackupCodeOption?: boolean;
}

export default function TotpVerificationModal({
  isOpen,
  onClose,
  onVerified,
  title = 'Enter Verification Code',
  description = 'Enter your 6-digit authenticator code to continue',
  showBackupCodeOption = true
}: TotpVerificationModalProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!code || (useBackupCode && code.length !== 8) || (!useBackupCode && code.length !== 6)) {
      setError(`Please enter a ${useBackupCode ? '8-character backup code' : '6-digit verification code'}`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { totpService } = await import('@/services/totpService');
      const result = await totpService.verify(code, useBackupCode);
      
      if (result.success && result.data?.valid) {
        onVerified();
        handleClose();
      } else {
        setError('Invalid code. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify code');
      console.error('Verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError('');
    setUseBackupCode(false);
    setIsLoading(false);
    onClose();
  };

  const handleCodeChange = (value: string) => {
    if (useBackupCode) {
      // Backup codes are 8 characters, alphanumeric
      const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      setCode(cleanValue);
    } else {
      // TOTP codes are 6 digits
      const cleanValue = value.replace(/\D/g, '').slice(0, 6);
      setCode(cleanValue);
    }
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="p-3 bg-indigo-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-indigo-600" />
            </div>
            <p className="text-sm text-gray-500">{description}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Code Input */}
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder={useBackupCode ? 'ABCD1234' : '000000'}
              className="w-full px-3 py-2 text-center text-2xl tracking-widest border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              maxLength={useBackupCode ? 8 : 6}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
            <div className="mt-2 text-xs text-gray-500 text-center">
              {useBackupCode ? 'Enter 8-character backup code' : 'Enter 6-digit code from your authenticator app'}
            </div>
          </div>

          {/* Backup Code Toggle */}
          {showBackupCodeOption && (
            <div className="text-center">
              <button
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setCode('');
                  setError('');
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!code || isLoading || (useBackupCode && code.length !== 8) || (!useBackupCode && code.length !== 6)}
              className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}