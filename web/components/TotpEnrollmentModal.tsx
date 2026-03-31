'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Download, CheckCircle2, AlertCircle, Smartphone, QrCode } from 'lucide-react';

interface TotpEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrollmentComplete: (backupCodes: string[]) => void;
  userEmail: string;
}

type EnrollmentStep = 'qr' | 'verify' | 'backup-codes';

export default function TotpEnrollmentModal({
  isOpen,
  onClose,
  onEnrollmentComplete,
  userEmail
}: TotpEnrollmentModalProps) {
  const [step, setStep] = useState<EnrollmentStep>('qr');
  const [qrCode, setQrCode] = useState<string>('');
  const [setupKey, setSetupKey] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('qr');
      setQrCode('');
      setSetupKey('');
      setBackupCodes([]);
      setVerificationCode('');
      setError('');
      startEnrollment();
    }
  }, [isOpen]);

  const startEnrollment = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const { totpService } = await import('@/services/totpService');
      const result = await totpService.enroll(userEmail);
      
      if (result.success && result.data) {
        setQrCode(result.data.qrCode);
        setSetupKey(result.data.setupKey);
        setBackupCodes(result.data.backupCodes);
      } else {
        setError(result.error || 'Failed to start enrollment');
      }
    } catch (err) {
      setError('Failed to start TOTP enrollment');
      console.error('Enrollment error:', err);
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
      const { totpService } = await import('@/services/totpService');
      const result = await totpService.verifyEnrollment(verificationCode);
      
      if (result.success && result.data?.valid) {
        if (result.data.backupCodes) {
          setBackupCodes(result.data.backupCodes);
        }
        setStep('backup-codes');
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify code');
      console.error('Verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onEnrollmentComplete(backupCodes);
    onClose();
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([`Pulseline 2FA Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${codesText}\n\nStore these codes in a safe place. Each code can only be used once.`], 
      { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pulseline-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl h-full max-h-[96vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Enable Two-Factor Authentication</h3>
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

        {/* Step 1: QR Code */}
        {step === 'qr' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="p-3 bg-indigo-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <QrCode className="h-8 w-8 text-indigo-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Scan QR Code</h4>
              <p className="text-sm text-gray-500">
                Use your authenticator app to scan this QR code
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600">Generating QR code...</span>
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center space-y-3">
                <img src={qrCode} alt="TOTP QR Code" className="border rounded-lg max-w-xs" />
                
                {/* Setup Key */}
                {setupKey && (
                  <div className="w-full max-w-lg space-y-2">
                    <p className="text-sm font-medium text-gray-900 text-center">
                      Can't scan? Enter this setup key manually:
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center justify-between">
                      <code className="text-xs font-mono text-gray-800 break-all flex-1 mr-2">
                        {setupKey}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(setupKey)}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy setup key"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 text-center max-w-md">
                  Compatible with Google Authenticator, Microsoft Authenticator, Authy, 1Password, and other TOTP apps
                </div>
              </div>
            ) : null}

            <div className="pt-4">
              <button
                onClick={() => setStep('verify')}
                disabled={!qrCode || isLoading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                I've Scanned the Code
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Verify Code */}
        {step === 'verify' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="p-3 bg-green-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Enter Verification Code</h4>
              <p className="text-sm text-gray-500">
                Enter the 6-digit code from your authenticator app
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
                className="w-full px-3 py-2 text-center text-2xl tracking-widest border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                maxLength={6}
                autoFocus
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('qr')}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleVerification}
                disabled={verificationCode.length !== 6 || isLoading}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === 'backup-codes' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="p-3 bg-yellow-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-yellow-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Save Backup Codes</h4>
              <p className="text-sm text-gray-500">
                Store these backup codes in a safe place. Each code can only be used once.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 text-sm font-mono">
                {backupCodes.map((code, index) => (
                  <div key={index} className="bg-white p-2 rounded border text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={copyBackupCodes}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <button
                onClick={downloadBackupCodes}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-700">
                  <strong>Important:</strong> Store these codes securely. If you lose access to your authenticator app, these codes are the only way to access your account.
                </div>
              </div>
            </div>

            <button
              onClick={handleComplete}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Complete Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}