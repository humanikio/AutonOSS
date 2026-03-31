'use client';

import { X, Copy, Download, AlertCircle, RefreshCw } from 'lucide-react';

interface BackupCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  backupCodes: string[];
  onRegenerate: () => void;
  title?: string;
}

export default function BackupCodesModal({
  isOpen,
  onClose,
  backupCodes,
  onRegenerate,
  title = 'Backup Codes'
}: BackupCodesModalProps) {
  
  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([
      `Pulseline 2FA Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${codesText}\n\nStore these codes in a safe place. Each code can only be used once.`
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pulseline-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Use these backup codes to access your account if you lose your authenticator device. 
              Each code can only be used once.
            </p>
          </div>

          {/* Backup Codes Grid */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-white p-3 rounded border text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={copyBackupCodes}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Codes
            </button>
            <button
              onClick={downloadBackupCodes}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>

          {/* Regenerate Button */}
          <div className="pt-2">
            <button
              onClick={onRegenerate}
              className="w-full bg-yellow-100 text-yellow-800 py-2 px-4 rounded-lg hover:bg-yellow-200 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Generate New Codes
            </button>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Generating new codes will invalidate the current ones
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-700">
                <strong>Important:</strong> Store these codes in a secure location. 
                If you lose both your authenticator device and these backup codes, 
                you may be permanently locked out of your account.
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="pt-4">
            <button
              onClick={onClose}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}