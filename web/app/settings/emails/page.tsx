'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import {
  Mail,
  Search,
  Filter,
  Plus,
  Settings,
  ExternalLink,
  Edit2,
  ArrowLeft,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Shield
} from 'lucide-react';

interface EmailAccount {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'mailgun' | 'customMailgun';
  friendlyName: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  connectedAt: string;
  lastSync?: string;
  syncEnabled: boolean;
  foldersSynced: number;
  messagesCount: number;
}

interface Domain {
  domainId: string;
  displayName?: string;
  verification: {
    status: string;
  };
  connections: {
    mailgun?: boolean;
  };
}

interface MailgunDomain {
  domainId: string;
  state: string;
  status: string;
  verification?: {
    allRecordsValid: boolean;
    sendingRecordsValid: boolean;
    receivingRecordsValid: boolean;
  };
}

/**
 * Extract root domain from any subdomain
 * Examples:
 * - www.example.com -> example.com
 * - app.example.com -> example.com
 * - mail.example.co.uk -> example.co.uk
 * - example.com -> example.com
 */
function extractRootDomain(domain: string): string {
  const parts = domain.split('.');

  // If already a root domain (2 parts), return as-is
  if (parts.length <= 2) {
    return domain;
  }

  // List of known second-level domains (SLDs) for multi-part TLDs
  const knownSLDs = ['co', 'com', 'org', 'gov', 'edu', 'net', 'ac', 'mil'];

  const lastPart = parts[parts.length - 1];
  const secondLastPart = parts[parts.length - 2];

  // Check if this is a multi-part TLD (e.g., .co.uk)
  if (lastPart.length <= 3 && knownSLDs.includes(secondLastPart)) {
    return parts.slice(-3).join('.');
  }

  // Standard TLD - keep last 2 parts
  return parts.slice(-2).join('.');
}

export default function EmailManagement() {
  const router = useRouter();
  const { user, currentTenantId, getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'manage' | 'connect'>('manage');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState<EmailAccount | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [defaultAccountId, setDefaultAccountId] = useState<string>('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [editingEmailLocalPart, setEditingEmailLocalPart] = useState<string>('');
  const [editingEmailDomain, setEditingEmailDomain] = useState<string>('');

  // Custom domain email states
  const [verifiedDomains, setVerifiedDomains] = useState<Domain[]>([]);
  const [mailgunDomains, setMailgunDomains] = useState<MailgunDomain[]>([]);
  const [showCustomEmailModal, setShowCustomEmailModal] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [customEmailLocalPart, setCustomEmailLocalPart] = useState<string>('');
  const [customEmailName, setCustomEmailName] = useState<string>('');
  const [isCreatingCustomEmail, setIsCreatingCustomEmail] = useState(false);

  // Load email accounts and config
  useEffect(() => {
    const loadEmailAccounts = async () => {
      if (!user || !currentTenantId) return;

      setIsLoading(true);
      try {
        const token = await getToken();

        // Fetch default account config
        const configResponse = await fetch(`/api/email-accounts/config?tenantId=${currentTenantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (configResponse.ok) {
          const config = await configResponse.json();
          setDefaultAccountId(config?.defaultAccountId || '');
        }

        // Fetch all email accounts
        const response = await fetch(`/api/email-accounts?tenantId=${currentTenantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const accounts = await response.json();
          setEmailAccounts(accounts);
        }
      } catch (error) {
        console.error('Error loading email accounts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEmailAccounts();
  }, [user, currentTenantId, getToken]);

  // Load verified domains with Mailgun connection
  useEffect(() => {
    const loadVerifiedDomains = async () => {
      if (!user || !currentTenantId) return;

      try {
        const token = await getToken();
        const response = await fetch(`/api/domains?tenantId=${currentTenantId}&verified=true&hasConnection=mailgun`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setVerifiedDomains(data.domains || []);
        }
      } catch (error) {
        console.error('Error loading verified domains:', error);
      }
    };

    loadVerifiedDomains();
  }, [user, currentTenantId, getToken]);

  // Load Mailgun domain verification status
  useEffect(() => {
    const loadMailgunDomains = async () => {
      if (!user || !currentTenantId) return;

      try {
        const token = await getToken();
        const response = await fetch(`/api/mailgun/domains?tenantId=${currentTenantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setMailgunDomains(data.domains || []);
        }
      } catch (error) {
        console.error('Error loading Mailgun domains:', error);
      }
    };

    loadMailgunDomains();
  }, [user, currentTenantId, getToken]);

  // Check if Pulseline Email is already enabled
  const autonEmailEnabled = emailAccounts.some(acc => acc.provider === 'mailgun');

  // Filter email accounts
  const filteredEmailAccounts = emailAccounts.filter(account => {
    const matchesSearch = searchQuery === '' ||
      account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.friendlyName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProvider = selectedProvider === 'all' ||
      account.provider === selectedProvider;

    return matchesSearch && matchesProvider;
  });

  const handleConnectGmail = async () => {
    if (!user || !currentTenantId) {
      console.error('Missing user or tenant ID');
      alert('Please ensure you are logged in and try again');
      return;
    }

    setIsConnecting(true);
    try {
      const token = await getToken();
      console.log('Initiating Gmail OAuth for tenant:', currentTenantId);

      const response = await fetch('/api/oauth/google/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          userId: user.uid
        })
      });
      
      const responseData = await response.json();
      console.log('OAuth response:', responseData);
      
      if (response.ok && responseData.authUrl) {
        console.log('Redirecting to Google OAuth:', responseData.authUrl);
        window.location.href = responseData.authUrl;
      } else {
        throw new Error(responseData.error || 'Failed to initiate OAuth');
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      alert(`Failed to connect Gmail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };


  const handleConnectAutonEmail = async () => {
    if (!user || !currentTenantId) {
      console.error('Missing user or tenant ID');
      alert('Please ensure you are logged in and try again');
      return;
    }

    setIsConnecting(true);
    try {
      const token = await getToken();
      console.log('Creating Pulseline Email account for tenant:', currentTenantId);

      const response = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          provider: 'mailgun',
          name: 'Pulseline Email'
        })
      });

      const responseData = await response.json();
      console.log('Pulseline Email response:', responseData);

      if (response.ok && responseData.success) {
        // Reload email accounts
        const accountsResponse = await fetch(`/api/email-accounts?tenantId=${currentTenantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (accountsResponse.ok) {
          const accounts = await accountsResponse.json();
          setEmailAccounts(accounts);
        }

        // Switch to manage tab to show the new account
        setActiveTab('manage');
        alert('Pulseline Email account created successfully!');
      } else {
        // Handle specific error for already existing account
        if (response.status === 400 && responseData.error?.includes('already enabled')) {
          alert('Pulseline Email is already enabled for your account.');
          // Reload accounts to sync state
          const accountsResponse = await fetch(`/api/email-accounts?tenantId=${currentTenantId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (accountsResponse.ok) {
            const accounts = await accountsResponse.json();
            setEmailAccounts(accounts);
          }
        } else {
          throw new Error(responseData.error || 'Failed to create Pulseline Email account');
        }
      }
    } catch (error) {
      console.error('Error creating Pulseline Email:', error);
      alert(`Failed to create Pulseline Email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Commenting out unused toggle sync function - may be used in future
  // const handleToggleSync = async (accountId: string) => {
  //   if (!currentTenantId) return;

  //   const account = emailAccounts.find(acc => acc.id === accountId);
  //   if (!account) return;

  //   try {
  //     const token = await getToken();
  //     const response = await fetch(`/api/email-accounts/${accountId}/sync`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token}`
  //       },
  //       body: JSON.stringify({
  //         tenantId: currentTenantId,
  //         syncEnabled: !account.syncEnabled
  //       })
  //     });

  //     if (response.ok) {
  //       setEmailAccounts(prev =>
  //         prev.map(acc =>
  //           acc.id === accountId
  //             ? { ...acc, syncEnabled: !acc.syncEnabled }
  //             : acc
  //         )
  //       );
  //     } else {
  //       console.error('Failed to update sync status');
  //     }
  //   } catch (error) {
  //     console.error('Error updating sync status:', error);
  //   }
  // };

  const handleSetDefaultAccount = async (accountId: string) => {
    if (!currentTenantId) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/email-accounts/config/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          accountId
        })
      });

      if (response.ok) {
        setDefaultAccountId(accountId);
      } else {
        console.error('Failed to set default account');
        alert('Failed to set default email account');
      }
    } catch (error) {
      console.error('Error setting default account:', error);
      alert('Failed to set default email account');
    }
  };

  const handleStartEditName = (accountId: string, currentName: string, currentEmail: string) => {
    setEditingAccountId(accountId);
    setEditingName(currentName);

    // Parse email into local part and domain for Mailgun accounts
    const atIndex = currentEmail.indexOf('@');
    if (atIndex !== -1) {
      setEditingEmailLocalPart(currentEmail.substring(0, atIndex));
      setEditingEmailDomain(currentEmail.substring(atIndex)); // includes @
    } else {
      setEditingEmailLocalPart(currentEmail);
      setEditingEmailDomain('');
    }
  };

  const handleSaveEditName = async (accountId: string) => {
    if (!currentTenantId || !editingName.trim()) return;

    try {
      const token = await getToken();

      // Build update payload - include email only if it changed
      const account = emailAccounts.find(acc => acc.id === accountId);
      const payload: { tenantId: string; name: string; email?: string } = {
        tenantId: currentTenantId,
        name: editingName.trim()
      };

      // Only include email if it changed (for Mailgun accounts)
      if (account?.provider === 'mailgun') {
        // Reconstruct full email from local part and domain
        const fullEmail = editingEmailLocalPart.trim() + editingEmailDomain;

        if (fullEmail !== account.email) {
          // Validate local part
          if (!editingEmailLocalPart.trim()) {
            alert('Email address cannot be empty');
            return;
          }
          if (!editingEmailDomain) {
            alert('Invalid email format');
            return;
          }
          payload.email = fullEmail;
        }
      }

      const response = await fetch(`/api/email-accounts/${accountId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Update local state
        setEmailAccounts(prev =>
          prev.map(acc =>
            acc.id === accountId
              ? {
                  ...acc,
                  friendlyName: editingName.trim(),
                  email: payload.email || acc.email
                }
              : acc
          )
        );
        setEditingAccountId(null);
        setEditingName('');
        setEditingEmailLocalPart('');
        setEditingEmailDomain('');
      } else {
        const errorData = await response.json();
        console.error('Failed to update account:', errorData);
        alert(errorData.error || 'Failed to update account');
      }
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Failed to update account');
    }
  };

  const handleCancelEditName = () => {
    setEditingAccountId(null);
    setEditingName('');
    setEditingEmailLocalPart('');
    setEditingEmailDomain('');
  };

  const handleRemoveAccount = (accountId: string) => {
    const account = emailAccounts.find(acc => acc.id === accountId);
    if (account) {
      setAccountToRemove(account);
    }
  };

  const confirmRemoveAccount = async () => {
    if (!currentTenantId || !accountToRemove) return;

    setIsRemoving(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/email-accounts/${accountToRemove.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenantId: currentTenantId
        })
      });
      
      if (response.ok) {
        setEmailAccounts(prev => prev.filter(account => account.id !== accountToRemove.id));
        setAccountToRemove(null);
      } else {
        console.error('Failed to remove account');
        alert('Failed to remove account. Please try again.');
      }
    } catch (error) {
      console.error('Error removing account:', error);
      alert('Error removing account. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  const cancelRemoveAccount = () => {
    setAccountToRemove(null);
  };

  const handleCreateCustomEmail = async () => {
    if (!user || !currentTenantId || !selectedDomainId || !customEmailLocalPart.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate email local part format
    if (!/^[a-z0-9._-]+$/.test(customEmailLocalPart)) {
      alert('Email local part can only contain lowercase letters, numbers, dots, hyphens, and underscores');
      return;
    }

    setIsCreatingCustomEmail(true);
    try {
      const token = await getToken();
      console.log('Creating custom domain email for tenant:', currentTenantId);

      const response = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          provider: 'customMailgun',
          domainId: selectedDomainId,
          emailLocalPart: customEmailLocalPart.trim(),
          name: customEmailName.trim() || `${customEmailLocalPart}@${selectedDomainId}`
        })
      });

      const responseData = await response.json();
      console.log('Custom email response:', responseData);

      if (response.ok && responseData.success) {
        // Reload email accounts
        const accountsResponse = await fetch(`/api/email-accounts?tenantId=${currentTenantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (accountsResponse.ok) {
          const accounts = await accountsResponse.json();
          setEmailAccounts(accounts);
        }

        // Reset form and close modal
        setShowCustomEmailModal(false);
        setSelectedDomainId('');
        setCustomEmailLocalPart('');
        setCustomEmailName('');
        setActiveTab('manage');
        alert(`Custom email ${responseData.email} created successfully!`);
      } else {
        throw new Error(responseData.error || 'Failed to create custom email account');
      }
    } catch (error) {
      console.error('Error creating custom email:', error);
      alert(`Failed to create custom email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingCustomEmail(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    if (provider === 'gmail') {
      return (
        <Image
          src="/google_mail_gmail_logo_icon_159346.png"
          alt="Gmail"
          width={20}
          height={20}
          className="object-contain"
        />
      );
    } else if (provider === 'outlook') {
      return <Mail className="h-5 w-5 text-blue-600" />;
    } else if (provider === 'mailgun') {
      return (
        <Image
          src="/autonEmailMascot.png"
          alt="Pulseline Email"
          width={20}
          height={20}
          className="object-contain"
        />
      );
    } else if (provider === 'customMailgun') {
      return <Mail className="h-5 w-5 text-purple-600" />;
    }
    return <Mail className="h-5 w-5 text-gray-600" />;
  };

  // Helper function to get Mailgun domain verification status
  const getMailgunDomainStatus = (domainId: string) => {
    const rootDomain = extractRootDomain(domainId);
    const mailgunDomain = mailgunDomains.find(d => d.domainId === rootDomain);

    if (!mailgunDomain) {
      return {
        isFullyVerified: false,
        status: 'not_configured',
        statusText: 'Not Configured',
        statusColor: 'gray'
      };
    }

    const isFullyVerified =
      mailgunDomain.state === 'active' &&
      mailgunDomain.verification?.allRecordsValid === true;

    const isSendingReady =
      mailgunDomain.verification?.sendingRecordsValid === true;

    if (isFullyVerified) {
      return {
        isFullyVerified: true,
        status: 'verified',
        statusText: 'Verified',
        statusColor: 'green'
      };
    } else if (isSendingReady) {
      return {
        isFullyVerified: false,
        status: 'partial',
        statusText: 'Sending Ready',
        statusColor: 'blue'
      };
    } else {
      return {
        isFullyVerified: false,
        status: 'pending',
        statusText: 'DNS Setup Required',
        statusColor: 'yellow'
      };
    }
  };

  return (
    <>
      {/* Glassmorphic background */}
      <div className="fixed inset-0 bg-gray-50 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-100/20 via-blue-50/15 to-primary-50/10"></div>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-96 -right-96 w-[1000px] h-[1000px] bg-gradient-to-br from-primary-200/35 to-blue-300/25 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-96 -left-96 w-[900px] h-[900px] bg-gradient-to-tr from-blue-200/30 to-primary-300/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-gradient-to-br from-primary-100/20 to-blue-200/15 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="relative min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Back to Settings</span>
            </button>
          </div>
          <h1 className="text-3xl font-light text-gray-900">Email Accounts</h1>
          <p className="mt-2 text-gray-500">Connect and manage your Gmail, Outlook, and Pulseline Email accounts</p>
        </div>

        {/* Default Email Account Selector */}
        {emailAccounts.length > 0 && (
          <div className="mb-8 backdrop-blur-xl bg-white/70 border border-white/60 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-1">Default Email Account</h2>
                <p className="text-sm text-gray-500">Choose which email account to use by default when sending emails</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <select
                    value={defaultAccountId}
                    onChange={(e) => handleSetDefaultAccount(e.target.value)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="">No default selected</option>
                    {emailAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.friendlyName} ({account.provider === 'gmail' ? 'Gmail' : account.provider === 'outlook' ? 'Outlook' : account.provider === 'customMailgun' ? 'Custom Pulseline Email' : 'Pulseline Email'})
                      </option>
                    ))}
                  </select>
                  {defaultAccountId && emailAccounts.find(acc => acc.id === defaultAccountId) && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {emailAccounts.find(acc => acc.id === defaultAccountId)?.provider === 'gmail' ? (
                          <Image
                            src="/google_mail_gmail_logo_icon_159346.png"
                            alt="Gmail"
                            width={20}
                            height={20}
                            className="object-contain"
                          />
                        ) : emailAccounts.find(acc => acc.id === defaultAccountId)?.provider === 'mailgun' ? (
                          <Image
                            src="/autonEmailMascot.png"
                            alt="Pulseline Email"
                            width={20}
                            height={20}
                            className="object-contain"
                          />
                        ) : (
                          <Mail className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {emailAccounts.find(acc => acc.id === defaultAccountId)?.friendlyName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'manage'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Manage Accounts ({isLoading ? '...' : emailAccounts.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('connect')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'connect'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Connect Account
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Filters for Manage Tab Only */}
        {activeTab === 'manage' && (
          <div className="mb-6 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your email accounts..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 bg-white border rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                  showFilters ? 'border-primary-500 text-primary-600' : 'border-gray-200 text-gray-700'
                }`}
              >
                <Filter className="h-5 w-5" />
                Filters
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Provider</label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-48 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Providers</option>
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook</option>
                    <option value="mailgun">Pulseline Email</option>
                    <option value="customMailgun">Custom Pulseline Email</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manage Accounts Tab */}
        {activeTab === 'manage' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Your Email Accounts</h2>
                <p className="text-sm text-gray-500">Manage your connected email accounts</p>
              </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <span className="ml-3 text-gray-600">Loading your email accounts...</span>
              </div>
            ) : (
              <>
                {/* Email Accounts Grid */}
                <div className="space-y-6">
                  {/* Auton Email Cards - Always First and Larger */}
                  {filteredEmailAccounts.filter(acc => acc.provider === 'mailgun').map(account => (
                    <div
                      key={account.id}
                      className="relative group backdrop-blur-xl bg-gradient-to-br from-blue-50/80 via-white/70 to-purple-50/80 border-2 border-blue-200/60 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-6">
                          <div className="backdrop-blur-lg border-2 border-blue-100/60 rounded-xl p-3 shadow-md bg-white/90">
                            <Image
                              src="/autonEmailMascot.png"
                              alt="Pulseline Email"
                              width={48}
                              height={48}
                              className="rounded-lg"
                            />
                          </div>
                          <div className="flex-1">
                            {editingAccountId === account.id ? (
                              <div className="space-y-2">
                                {/* Name editor */}
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    placeholder="Display name"
                                    className="px-2 py-1 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditName(account.id);
                                      if (e.key === 'Escape') handleCancelEditName();
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveEditName(account.id)}
                                    className="p-1 text-green-600 hover:text-green-700"
                                    title="Save"
                                  >
                                    <CheckCircle2 className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={handleCancelEditName}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    title="Cancel"
                                  >
                                    <AlertCircle className="h-5 w-5" />
                                  </button>
                                </div>
                                {/* Email editor */}
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingEmailLocalPart}
                                    onChange={(e) => setEditingEmailLocalPart(e.target.value)}
                                    placeholder="username"
                                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 text-gray-600"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditName(account.id);
                                      if (e.key === 'Escape') handleCancelEditName();
                                    }}
                                  />
                                  <span className="text-sm text-gray-600 font-mono">{editingEmailDomain}</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-xl font-semibold text-gray-900">{account.friendlyName}</h3>
                                  <button
                                    onClick={() => handleStartEditName(account.id, account.friendlyName, account.email)}
                                    className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                                    title="Edit name and email"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="space-y-1.5 mt-2">
                                  <p className="text-sm text-gray-700 font-medium">{account.email}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 text-xs rounded-full font-medium border border-purple-200">
                                      Automated sending service
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleRemoveAccount(account.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove account"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1.5 text-sm rounded-full font-medium backdrop-blur-sm border ${
                            account.status === 'active' ? 'bg-green-100/80 border-green-200/60 text-green-700' :
                            account.status === 'inactive' ? 'bg-gray-100/80 border-gray-200/60 text-gray-700' :
                            account.status === 'pending' ? 'bg-yellow-100/80 border-yellow-200/60 text-yellow-700' :
                            'bg-red-100/80 border-red-200/60 text-red-700'
                          }`}>
                            {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                          </span>
                          <span className="px-3 py-1.5 text-sm rounded-full font-medium backdrop-blur-sm border bg-gradient-to-r from-purple-100/80 to-blue-100/80 border-purple-200/60 text-purple-700">
                            Pulseline Email
                          </span>
                        </div>

                        <div className="pt-3 border-t border-gray-200/50">
                          <div className="text-sm text-gray-600">
                            <span>Connected: {new Date(account.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Other Email Accounts - Larger Cards Grid */}
                  {filteredEmailAccounts.filter(acc => acc.provider !== 'mailgun').length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredEmailAccounts.filter(acc => acc.provider !== 'mailgun').map(account => (
                    <div
                      key={account.id}
                      className="relative group backdrop-blur-xl bg-white/70 border border-white/60 rounded-2xl p-6 shadow-lg hover:bg-white/80 transition-all duration-300 hover:shadow-xl"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`backdrop-blur-lg border rounded-xl p-3 shadow-md ${
                            account.provider === 'gmail' ? 'bg-white/90 border-gray-100/60' :
                            account.provider === 'outlook' ? 'bg-blue-50/80 border-blue-100/60' :
                            'bg-purple-50/80 border-purple-100/60'
                          }`}>
                            {account.provider === 'gmail' ? (
                              <Image
                                src="/google_mail_gmail_logo_icon_159346.png"
                                alt="Gmail"
                                width={32}
                                height={32}
                                className="object-contain"
                              />
                            ) : (
                              getProviderIcon(account.provider)
                            )}
                          </div>
                          <div className="flex-1">
                            {editingAccountId === account.id ? (
                              <div className="space-y-2">
                                {/* Name editor */}
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    placeholder="Display name"
                                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditName(account.id);
                                      if (e.key === 'Escape') handleCancelEditName();
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveEditName(account.id)}
                                    className="p-1 text-green-600 hover:text-green-700"
                                    title="Save"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEditName}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    title="Cancel"
                                  >
                                    <AlertCircle className="h-4 w-4" />
                                  </button>
                                </div>
                                {/* Email editor (Mailgun only) */}
                                {account.provider === 'mailgun' && (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editingEmailLocalPart}
                                      onChange={(e) => setEditingEmailLocalPart(e.target.value)}
                                      placeholder="username"
                                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 text-gray-600"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEditName(account.id);
                                        if (e.key === 'Escape') handleCancelEditName();
                                      }}
                                    />
                                    <span className="text-xs text-gray-600 font-mono">{editingEmailDomain}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-gray-900">{account.friendlyName}</h3>
                                  {account.provider === 'mailgun' && (
                                    <button
                                      onClick={() => handleStartEditName(account.id, account.friendlyName, account.email)}
                                      className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                                      title="Edit name and email"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                                {account.provider === 'mailgun' ? (
                                  <div className="space-y-1 mt-1">
                                    <p className="text-xs text-gray-600">{account.email}</p>
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Send-only service</span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">{account.email}</p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleRemoveAccount(account.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1.5 text-xs rounded-full font-medium backdrop-blur-sm border ${
                            account.status === 'active' ? 'bg-green-100/80 border-green-200/60 text-green-700' :
                            account.status === 'inactive' ? 'bg-gray-100/80 border-gray-200/60 text-gray-700' :
                            account.status === 'pending' ? 'bg-yellow-100/80 border-yellow-200/60 text-yellow-700' :
                            'bg-red-100/80 border-red-200/60 text-red-700'
                          }`}>
                            {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                          </span>
                          <span className={`px-3 py-1.5 text-xs rounded-full font-medium backdrop-blur-sm border ${
                            account.provider === 'gmail' ? 'bg-red-100/80 border-red-200/60 text-red-700' :
                            account.provider === 'outlook' ? 'bg-blue-100/80 border-blue-200/60 text-blue-700' :
                            'bg-purple-100/80 border-purple-200/60 text-purple-700'
                          }`}>
                            {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-gray-200/50">
                          <div className="text-xs text-gray-500">
                            <span>Connected: {new Date(account.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Empty State for Manage */}
                {filteredEmailAccounts.length === 0 && (
                  <div className="text-center py-12">
                    <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No email accounts found</p>
                    <button
                      onClick={() => setActiveTab('connect')}
                      className="mt-4 text-sm text-primary-600 hover:text-primary-700"
                    >
                      Connect your first account
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Connect Account Tab */}
        {activeTab === 'connect' && (
          <div className="max-w-5xl mx-auto">
            {/* Featured: Auton Email Section */}
            <div className="mb-10">
              {!autonEmailEnabled && (
                <div className="mb-4 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-3">
                    <Zap className="h-4 w-4" />
                    Recommended
                  </div>
                  <h2 className="text-2xl font-light text-gray-900 mb-2">Pulseline Managed Email</h2>
                  <p className="text-sm text-gray-500 max-w-2xl mx-auto">
                    Send automated emails to your contacts with enterprise-grade infrastructure
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Note: This is a send-only service for outbound automation, not a personal inbox
                  </p>
                </div>
              )}

              <div className={`bg-gradient-to-br from-purple-50 via-white to-blue-50 border-2 border-purple-200 rounded-xl shadow-md ${
                autonEmailEnabled ? 'p-4' : 'p-6'
              }`}>
                <div className={`grid items-center ${
                  autonEmailEnabled ? 'md:grid-cols-1 gap-3' : 'md:grid-cols-2 gap-6'
                }`}>
                  {/* Left: Image - Only show when not connected */}
                  {!autonEmailEnabled && (
                    <div className="relative flex items-center justify-center p-8">
                      <div className="relative bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 border-2 border-white shadow-lg">
                        <Image
                          src="/autonEmailMascot.png"
                          alt="Pulseline Email Platform"
                          width={280}
                          height={280}
                          className="rounded-lg drop-shadow-2xl"
                          priority
                        />
                      </div>
                    </div>
                  )}

                  {/* Right: Content */}
                  <div>
                    {autonEmailEnabled ? (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="backdrop-blur-lg border-2 border-blue-100/60 rounded-lg p-2 shadow-sm bg-white/90">
                            <Image
                              src="/autonEmailMascot.png"
                              alt="Pulseline Email"
                              width={32}
                              height={32}
                              className="rounded"
                            />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">
                              Pulseline Managed Email
                            </h3>
                            <p className="text-xs text-gray-600">
                              Automated sending • Enterprise infrastructure
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('manage')}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 font-medium text-sm whitespace-nowrap"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Manage Auto
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          Professional Email Made Simple
                        </h3>

                        <div className="space-y-3 mb-5">
                          <div className="flex items-start gap-2">
                            <div className="p-1.5 bg-purple-100 rounded-lg mt-0.5">
                              <CheckCircle2 className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm text-gray-900">Automated Sending</h4>
                              <p className="text-xs text-gray-600">Perfect for workflows, notifications, and outbound campaigns</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <div className="p-1.5 bg-blue-100 rounded-lg mt-0.5">
                              <Shield className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm text-gray-900">Enterprise Infrastructure</h4>
                              <p className="text-xs text-gray-600">99.9% uptime with industry-leading deliverability</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <div className="p-1.5 bg-green-100 rounded-lg mt-0.5">
                              <Zap className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm text-gray-900">Smart Tracking</h4>
                              <p className="text-xs text-gray-600">Automatic reply tracking and conversation threading</p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleConnectAutonEmail}
                          disabled={isConnecting}
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-5 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Setting up...
                            </>
                          ) : (
                            <>
                              <Plus className="h-5 w-5" />
                              Enable Pulseline Email
                            </>
                          )}
                        </button>

                        <p className="text-xs text-gray-500 mt-3 text-center">
                          Free to use • No credit card required • Cancel anytime
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Domain Email Section */}
            {verifiedDomains.length > 0 && (
              <>
                {/* Divider */}
                <div className="relative mb-10">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-50 text-gray-500">Or use your custom domain</span>
                  </div>
                </div>

                <div className="mb-10">
                  <div className="mb-4 text-center">
                    <h2 className="text-2xl font-light text-gray-900 mb-2">Custom Pulseline Email</h2>
                    <p className="text-sm text-gray-500 max-w-2xl mx-auto">
                      Create unlimited Pulseline Email addresses using your verified custom domains
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-200 rounded-xl p-6 shadow-md">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Available Domains ({verifiedDomains.length})
                      </h3>
                      <p className="text-sm text-gray-600">
                        Select a verified domain to create a custom email address
                      </p>
                    </div>

                    {/* DNS Setup Warning Banner */}
                    {verifiedDomains.some(domain => {
                      const status = getMailgunDomainStatus(domain.domainId);
                      return !status.isFullyVerified && status.status !== 'partial';
                    }) && (
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-yellow-900 mb-1">DNS Setup Required</h4>
                            <p className="text-sm text-yellow-800">
                              Some domains need DNS configuration before you can create custom email addresses.
                              Click "Setup DNS" on any domain card below to configure the required DNS records.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {verifiedDomains.map((domain) => {
                        const rootDomain = extractRootDomain(domain.domainId);
                        const isSubdomain = rootDomain !== domain.domainId;
                        const mailgunStatus = getMailgunDomainStatus(domain.domainId);

                        return (
                          <div
                            key={domain.domainId}
                            className={`bg-white border rounded-lg p-4 transition-all ${
                              mailgunStatus.isFullyVerified || mailgunStatus.status === 'partial'
                                ? 'border-gray-200 hover:border-primary-300 hover:shadow-sm'
                                : 'border-yellow-200 bg-yellow-50/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{domain.displayName || rootDomain}</h4>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                mailgunStatus.statusColor === 'green'
                                  ? 'bg-green-100 text-green-700'
                                  : mailgunStatus.statusColor === 'blue'
                                  ? 'bg-blue-100 text-blue-700'
                                  : mailgunStatus.statusColor === 'yellow'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {mailgunStatus.statusText}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-1">{rootDomain}</p>
                            {isSubdomain && (
                              <p className="text-xs text-gray-400 mb-2">Emails will use root domain</p>
                            )}

                            {mailgunStatus.isFullyVerified || mailgunStatus.status === 'partial' ? (
                              <button
                                onClick={() => {
                                  setSelectedDomainId(domain.domainId);
                                  setShowCustomEmailModal(true);
                                }}
                                className="w-full bg-primary-600 text-white py-2 px-3 rounded-lg hover:bg-primary-700 transition-colors text-sm flex items-center justify-center gap-2 mt-2"
                              >
                                <Plus className="h-4 w-4" />
                                Create Email
                              </button>
                            ) : (
                              <button
                                onClick={() => router.push(`/settings/domains/manage/${domain.domainId}`)}
                                className="w-full bg-yellow-600 text-white py-2 px-3 rounded-lg hover:bg-yellow-700 transition-colors text-sm flex items-center justify-center gap-2 mt-2"
                              >
                                <Settings className="h-4 w-4" />
                                Setup DNS
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-blue-900 mb-1">Unlimited Custom Pulseline Email Addresses</h4>
                          <p className="text-sm text-blue-700">
                            Create as many automated email addresses as you need per domain (e.g., sales@yourdomain.com, support@yourdomain.com). All emails will use the root domain automatically.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Divider */}
            <div className="relative mb-12">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-500">Or connect your personal email</span>
              </div>
            </div>

            {/* Personal Email Providers */}
            <div>
              <div className="mb-6 text-center">
                <h3 className="text-xl font-medium text-gray-900 mb-2">Personal Email Accounts</h3>
                <p className="text-gray-500">Connect your actual Gmail or Outlook inbox for two-way email communication</p>
              </div>

              <div className="max-w-md mx-auto">
                {/* Gmail Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all">
                  <div className="text-center">
                    <div className="p-4 bg-white rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-gray-100">
                      <Image
                        src="/google_mail_gmail_logo_icon_159346.png"
                        alt="Gmail"
                        width={56}
                        height={56}
                        className="object-contain"
                      />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Gmail</h4>
                    <p className="text-sm text-gray-500 mb-4">Connect your Google account</p>
                    <button
                      onClick={handleConnectGmail}
                      disabled={isConnecting}
                      className="w-full bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Connect Gmail
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Secure Connection</h4>
                  <p className="text-sm text-blue-700">
                    We use OAuth 2.0 authentication to securely connect to your email accounts. 
                    We never store your email passwords and you can revoke access at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remove Account Confirmation Modal */}
        {accountToRemove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Remove Email Account</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  Are you sure you want to remove this email account?
                </p>
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      accountToRemove.provider === 'gmail' ? 'bg-red-50' :
                      accountToRemove.provider === 'outlook' ? 'bg-blue-50' :
                      'bg-purple-50'
                    }`}>
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{accountToRemove.friendlyName}</p>
                      <p className="text-sm text-gray-500">{accountToRemove.email}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {accountToRemove.provider === 'mailgun'
                    ? 'This will disable your automated email sending service. This action cannot be undone.'
                    : 'This will permanently remove the account and stop all email synchronization. This action cannot be undone.'}
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelRemoveAccount}
                  disabled={isRemoving}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveAccount}
                  disabled={isRemoving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRemoving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Remove Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Email Creation Modal */}
        {showCustomEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-100 rounded-full">
                  <Mail className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Create Custom Pulseline Email</h3>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domain
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900">{extractRootDomain(selectedDomainId)}</p>
                    {extractRootDomain(selectedDomainId) !== selectedDomainId && (
                      <p className="text-xs text-gray-500 mt-1">Root domain extracted from: {selectedDomainId}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customEmailLocalPart}
                      onChange={(e) => setCustomEmailLocalPart(e.target.value.toLowerCase())}
                      placeholder="sales"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus
                    />
                    <span className="text-gray-600 font-mono">@{extractRootDomain(selectedDomainId)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use lowercase letters, numbers, dots, hyphens, and underscores only
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customEmailName}
                    onChange={(e) => setCustomEmailName(e.target.value)}
                    placeholder="Sales Team"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <strong>Preview:</strong> {customEmailLocalPart || '(email)'}@{extractRootDomain(selectedDomainId)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCustomEmailModal(false);
                    setSelectedDomainId('');
                    setCustomEmailLocalPart('');
                    setCustomEmailName('');
                  }}
                  disabled={isCreatingCustomEmail}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomEmail}
                  disabled={isCreatingCustomEmail || !customEmailLocalPart.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingCustomEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}