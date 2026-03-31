'use client';

import { useState, useEffect } from 'react';
import { Search, Mail, ExternalLink, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface EmailAccount {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook';
  friendlyName: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  connectedAt: string;
  lastSync?: string;
  syncEnabled: boolean;
  foldersSynced: number;
  messagesCount: number;
}

interface EmailBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmail: (email: string, emailId?: string) => void;
  selectedEmail?: string;
}

export default function EmailBrowserModal({ isOpen, onClose, onSelectEmail, selectedEmail }: EmailBrowserModalProps) {
  const { user, tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load email accounts when modal opens
  useEffect(() => {
    if (isOpen && tenant?.id) {
      loadEmailAccounts();
    }
  }, [isOpen, tenant?.id]);

  const loadEmailAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/oauth/accounts?tenantId=${tenant?.id}`);
      if (response.ok) {
        const accounts = await response.json();
        setEmailAccounts(accounts);
      } else {
        console.error('Failed to load email accounts:', response.statusText);
        setEmailAccounts([]);
      }
    } catch (error) {
      console.error('Error loading email accounts:', error);
      setEmailAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter email accounts based on search
  const filteredEmailAccounts = emailAccounts.filter(account =>
    account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.friendlyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectEmail = (account: EmailAccount) => {
    onSelectEmail(account.email, account.id);
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'gmail': return 'bg-red-50 text-red-700';
      case 'outlook': return 'bg-blue-50 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProviderIcon = (provider: string) => {
    return <Mail className="h-4 w-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Select Email Account</h2>
              <p className="text-sm text-gray-500">Choose an email account to assign to this agent</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search email accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Email Accounts List */}
          <div className="flex-1 overflow-y-auto max-h-96">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-600">Loading email accounts...</span>
              </div>
            ) : (
              <>
                {filteredEmailAccounts.length > 0 ? (
                  <div className="p-6 space-y-3">
                    {filteredEmailAccounts.map((account) => (
                      <div
                        key={account.id}
                        onClick={() => handleSelectEmail(account)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-purple-300 hover:shadow-sm ${
                          selectedEmail === account.email
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getProviderColor(account.provider)}`}>
                              {getProviderIcon(account.provider)}
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{account.friendlyName}</h3>
                              <p className="text-sm text-gray-500">{account.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-md font-medium ${getStatusColor(account.status)}`}>
                                  {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              {account.messagesCount.toLocaleString()} messages
                            </div>
                            <div className="text-xs text-gray-400">
                              {account.foldersSynced} folders synced
                            </div>
                            {account.status === 'active' && (
                              <div className="flex items-center gap-1 mt-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-green-600">Active</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-6">
                    <Mail className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Accounts Found</h3>
                    <p className="text-gray-500 text-center mb-6">
                      {searchQuery
                        ? 'No email accounts match your search criteria.'
                        : 'You haven\'t connected any email accounts yet.'}
                    </p>
                    <Link
                      href="/settings/emails"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      onClick={onClose}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Connect Email Account
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {filteredEmailAccounts.length > 0 && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4" />
                <span>Need to connect a new email account?</span>
                <Link
                  href="/settings/emails"
                  className="text-purple-600 hover:text-purple-700 font-medium"
                  onClick={onClose}
                >
                  Go to Email Settings
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}