'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, Smartphone, MessageSquare, CheckCircle2 } from 'lucide-react';

interface SmsOtpSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete: () => void;
}

type SetupStep = 'phone' | 'verify' | 'complete';

export default function SmsOtpSetupModal({
  isOpen,
  onClose,
  onSetupComplete
}: SmsOtpSetupModalProps) {
  const [step, setStep] = useState<SetupStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhoneNumber('');
      setVerificationCode('');
      setError('');
    }
  }, [isOpen]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length >= 10) {
      const formatted = digits.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      return formatted;
    } else if (digits.length >= 6) {
      const formatted = digits.replace(/(\d{3})(\d{3})/, '($1) $2-');
      return formatted;
    } else if (digits.length >= 3) {
      const formatted = digits.replace(/(\d{3})/, '($1) ');
      return formatted;
    }
    
    return digits;
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber) {
      setError('Please enter your phone number');
      return;
    }

    // Basic validation - check if we have at least 10 digits
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { smsOtpService } = await import('@/services/smsOtpService');
      const result = await smsOtpService.setupSmsOtp(phoneNumber);
      
      if (result.success) {
        setStep('verify');
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (err) {
      setError('Failed to send verification code');
      console.error('SMS OTP setup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { smsOtpService } = await import('@/services/smsOtpService');
      const result = await smsOtpService.setupContinue(phoneNumber, verificationCode);
      
      if (result.success && result.data?.verified) {
        setStep('complete');
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify code');
      console.error('SMS OTP verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onSetupComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Enable SMS Two-Factor Authentication</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Step 1: Phone Number */}
        {step === 'phone' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="p-3 bg-blue-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Enter Your Phone Number</h4>
              <p className="text-sm text-gray-500">
                We'll send a verification code to confirm your phone number
              </p>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setPhoneNumber(formatted);
                  setError('');
                }}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                maxLength={14}
              />
              <div className="mt-1 text-xs text-gray-500">
                Enter your US phone number
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePhoneSubmit}
                disabled={!phoneNumber || isLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Code'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Verification */}
        {step === 'verify' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="p-3 bg-green-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Enter Verification Code</h4>
              <p className="text-sm text-gray-500">
                We sent a 6-digit code to <strong>{phoneNumber}</strong>
              </p>
            </div>

            <div>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                  setError('');
                }}
                placeholder="000000"
                className="w-full px-3 py-2 text-center text-2xl tracking-widest border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerification();
                  }
                }}
              />
              <div className="mt-2 text-xs text-gray-500 text-center">
                Enter the 6-digit code sent to your phone
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setStep('phone')}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleVerification}
                disabled={verificationCode.length !== 6 || isLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="p-3 bg-green-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">SMS 2FA Enabled!</h4>
              <p className="text-sm text-gray-500">
                SMS two-factor authentication has been successfully enabled for your account.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-700">
                <strong>Phone Number:</strong> {phoneNumber}
                <br />
                You'll receive SMS codes when signing in to your account.
              </div>
            </div>

            <button
              onClick={handleComplete}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Complete Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}