'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  ExternalLink,
  Trash2,
  Clock,
  X
} from 'lucide-react';

interface GHLAccount {
  id: string;
  locationId: string;
  locationName: string;
  companyId: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  connectedAt: string;
  lastSync?: string;
  syncEnabled: boolean;
  scopes: string[];
  userType?: string;
}

type NexusConnectionStatus = 'not_connected' | 'awaiting_verification' | 'connected';

interface NexusStatus {
  status: NexusConnectionStatus;
  nexusTenantId?: string;
  nexusUid?: string;
  connectedAt?: string;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, tenant, currentTenantId, getToken } = useAuth();

  const [ghlAccounts, setGhlAccounts] = useState<GHLAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accountToRemove, setAccountToRemove] = useState<GHLAccount | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Nexus state
  const [nexusStatus, setNexusStatus] = useState<NexusStatus | null>(null);
  const [isLoadingNexus, setIsLoadingNexus] = useState(true);
  const [showNexusModal, setShowNexusModal] = useState(false);
  const [nexusConnectMode, setNexusConnectMode] = useState<'auton' | 'existing' | null>(null);
  const [nexusEmail, setNexusEmail] = useState('');
  const [nexusPassword, setNexusPassword] = useState(''); // For non-Google: verification. For Google: new Nexus password
  const [isConnectingNexus, setIsConnectingNexus] = useState(false);
  const [nexusError, setNexusError] = useState<string | null>(null);

  // Check if user signed up with Google
  const isGoogleUser = auth.currentUser?.providerData.some(
    (provider) => provider.providerId === 'google.com'
  );

  // Check for OAuth callback success/error
  useEffect(() => {
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (successParam === 'true') {
      setSuccess('Successfully connected to your CRM account!');
      setTimeout(() => setSuccess(null), 5000);
      loadGHLAccounts();
    }

    if (errorParam) {
      setError('Failed to connect. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  }, [searchParams]);

  // Load Nexus status
  const loadNexusStatus = async () => {
    if (!currentTenantId) return;

    setIsLoadingNexus(true);
    try {
      const token = await getToken();
      if (!token) {
        setIsLoadingNexus(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/nexus/account/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setNexusStatus(result.data);
      }
    } catch (error) {
      console.error('Error loading Nexus status:', error);
    } finally {
      setIsLoadingNexus(false);
    }
  };

  // Load GHL accounts
  const loadGHLAccounts = async () => {
    if (!currentTenantId) return;

    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/oauth/location/accounts?tenantId=${currentTenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const accounts = await response.json();
        setGhlAccounts(accounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGHLAccounts();
    loadNexusStatus();
  }, [currentTenantId]);

  // Verify password for email/password users
  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!user?.email) return false;

    try {
      await signInWithEmailAndPassword(auth, user.email, password);
      return true;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  };

  // Connect to Nexus
  const handleConnectNexus = async () => {
    // Password always required (verification for email users, new Nexus password for Google users)
    if (!nexusPassword) {
      setNexusError(isGoogleUser ? 'Please create a password for your Nexus account' : 'Password is required');
      return;
    }

    if (nexusConnectMode === 'existing' && !nexusEmail) {
      setNexusError('Email is required for existing Nexus account');
      return;
    }

    setIsConnectingNexus(true);
    setNexusError(null);

    try {
      // For email/password users, verify password first
      if (!isGoogleUser) {
        const isValid = await verifyPassword(nexusPassword);
        if (!isValid) {
          setNexusError('Invalid password');
          setIsConnectingNexus(false);
          return;
        }
      }
      // Google users just provide the password they want - no verification needed

      const token = await getToken();
      if (!token) {
        setNexusError('Authentication required');
        setIsConnectingNexus(false);
        return;
      }

      const body: any = {
        password: nexusPassword,
      };

      if (nexusConnectMode === 'existing') {
        body.useExistingNexus = true;
        body.nexusEmail = nexusEmail;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/nexus/account/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(result.action === 'created'
          ? 'Nexus account created successfully!'
          : 'Connected to existing Nexus account!');
        setShowNexusModal(false);
        setNexusConnectMode(null);
        setNexusEmail('');
        setNexusPassword('');
        loadNexusStatus();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setNexusError(result.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('Error connecting to Nexus:', error);
      setNexusError('Failed to connect. Please try again.');
    } finally {
      setIsConnectingNexus(false);
    }
  };

  // Initiate OAuth connection
  const handleConnectGHL = async () => {
    if (!currentTenantId) {
      setError('No tenant selected. Please refresh the page.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required. Please refresh the page.');
        setIsConnecting(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/oauth/location/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantId: currentTenantId }),
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        window.location.href = authUrl;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to initiate connection');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      setError('Failed to connect. Please try again.');
      setIsConnecting(false);
    }
  };

  // Remove account
  const handleRemoveAccount = async () => {
    if (!accountToRemove || !currentTenantId) return;

    setIsRemoving(true);
    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        setTimeout(() => setError(null), 3000);
        setIsRemoving(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/oauth/location/accounts/${accountToRemove.locationId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ tenantId: currentTenantId }),
        }
      );

      if (response.ok) {
        setSuccess('Account disconnected successfully');
        setAccountToRemove(null);
        loadGHLAccounts();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to remove account');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error removing account:', error);
      setError('Failed to remove account');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsRemoving(false);
    }
  };

  // Toggle sync
  const handleToggleSync = async (account: GHLAccount) => {
    if (!currentTenantId) return;

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/oauth/location/accounts/${account.locationId}/sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            tenantId: currentTenantId,
            syncEnabled: !account.syncEnabled
          }),
        }
      );

      if (response.ok) {
        loadGHLAccounts();
      }
    } catch (error) {
      console.error('Error toggling sync:', error);
    }
  };

  const getNexusStatusBadge = () => {
    if (!nexusStatus) return null;

    const statusConfig = {
      connected: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Connected' },
      awaiting_verification: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Awaiting Verification' },
      not_connected: { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle, label: 'Not Connected' },
    };

    const config = statusConfig[nexusStatus.status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </span>
    );
  };

  const getGHLStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Loader2 },
      error: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-3.5 w-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
              <p className="mt-1 text-sm text-gray-600">
                Connect your CRM and other third-party services
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nexus Integration Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Zap className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Nexus</h2>
                    <p className="text-sm text-gray-600">AI infrastructure & compute</p>
                  </div>
                </div>
                {!isLoadingNexus && getNexusStatusBadge()}
              </div>

              <div className="mt-6">
                {isLoadingNexus ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : nexusStatus?.status === 'connected' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Connected since {new Date(nexusStatus.connectedAt!).toLocaleDateString()}
                    </p>
                  </div>
                ) : nexusStatus?.status === 'awaiting_verification' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Please verify your email to complete the connection.
                    </p>
                    <p className="text-xs text-gray-500">
                      Check your inbox for a verification email from Nexus.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNexusModal(true)}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Connect Nexus
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* GoHighLevel Integration Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-white rounded-lg flex items-center justify-center border border-gray-200 p-2">
                    <img
                      src="/ghlLogo/ghl-logo.png"
                      alt="GoHighLevel"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">GoHighLevel</h2>
                    <p className="text-sm text-gray-600">Sync conversations & contacts</p>
                  </div>
                </div>
                {ghlAccounts.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {ghlAccounts.length} Connected
                  </span>
                )}
              </div>

              <div className="mt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : ghlAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {ghlAccounts.slice(0, 2).map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-700 truncate">{account.locationName}</span>
                        {getGHLStatusBadge(account.status)}
                      </div>
                    ))}
                    {ghlAccounts.length > 2 && (
                      <p className="text-xs text-gray-500">+{ghlAccounts.length - 2} more</p>
                    )}
                    <button
                      onClick={handleConnectGHL}
                      disabled={isConnecting}
                      className="w-full mt-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-center gap-2"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Add Another Location
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectGHL}
                    disabled={isConnecting}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4" />
                        Connect GoHighLevel
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nexus Connect Modal */}
      {showNexusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Connect to Nexus
              </h3>
              <button
                onClick={() => {
                  setShowNexusModal(false);
                  setNexusConnectMode(null);
                  setNexusEmail('');
                  setNexusPassword('');
                  setNexusError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!nexusConnectMode ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  How would you like to connect?
                </p>
                <button
                  onClick={() => setNexusConnectMode('auton')}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
                >
                  <p className="font-medium text-gray-900">Use Pulseline Credentials</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Create a new Nexus account with your current Pulseline email
                  </p>
                </button>
                <button
                  onClick={() => setNexusConnectMode('existing')}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
                >
                  <p className="font-medium text-gray-900">Use Existing Nexus Account</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Link an existing Nexus account with a different email
                  </p>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setNexusConnectMode(null);
                    setNexusEmail('');
                    setNexusPassword('');
                    setNexusError(null);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                {nexusConnectMode === 'existing' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nexus Account Email
                    </label>
                    <input
                      type="email"
                      value={nexusEmail}
                      onChange={(e) => setNexusEmail(e.target.value)}
                      placeholder="your@nexus-email.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {isGoogleUser ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Create a Nexus Password
                    </label>
                    <input
                      type="password"
                      value={nexusPassword}
                      onChange={(e) => setNexusPassword(e.target.value)}
                      placeholder="Choose a password for Nexus"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be your Nexus account password
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Pulseline Password
                    </label>
                    <input
                      type="password"
                      value={nexusPassword}
                      onChange={(e) => setNexusPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This verifies your identity and becomes your Nexus password
                    </p>
                  </div>
                )}

                {nexusError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">{nexusError}</p>
                  </div>
                )}

                <button
                  onClick={handleConnectNexus}
                  disabled={isConnectingNexus}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isConnectingNexus ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remove Account Modal */}
      {accountToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Disconnect Account?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to disconnect "{accountToRemove.locationName}"? This will stop syncing conversations and contacts.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAccountToRemove(null)}
                disabled={isRemoving}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveAccount}
                disabled={isRemoving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
