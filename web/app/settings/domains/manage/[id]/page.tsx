'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { domainCrudService } from '../../services/domainCrudService';
import EditDomainModal from '../../components/EditDomainModal';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import MailgunVerificationStatus from '../../components/MailgunVerificationStatus';
import {
  ArrowLeft,
  Globe,
  CheckCircle2,
  AlertCircle,
  Shield,
  Mail,
  Loader2,
  Copy,
  ExternalLink,
  Settings,
  Trash2,
  RefreshCw,
  Link as LinkIcon,
  Edit,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Domain {
  domainId: string;
  displayName?: string;
  description?: string;
  isPrimary?: boolean;
  dnsProvider?: string;
  verification: {
    method: string;
    status: string;
    verificationToken?: string;
    verificationValue?: string;
    verifiedAt?: Date;
    lastCheckedAt?: Date;
    errorMessage?: string;
  };
  connections: {
    mailgun?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface MailgunDnsRecord {
  record_type: string;
  valid: string;
  name: string;
  value: string;
  priority?: string;
}

interface MailgunDomain {
  domainId: string;
  state: string;
  status: string;
  smtpLogin?: string;
  sendingDnsRecords: any[];
  receivingDnsRecords: any[];
  verification?: {
    lastVerified: Date;
    allRecordsValid: boolean;
    sendingRecordsValid: boolean;
    receivingRecordsValid: boolean;
    sendingRecords: MailgunDnsRecord[];
    receivingRecords: MailgunDnsRecord[];
    state: string;
  };
}

export default function DomainManagePage() {
  const router = useRouter();
  const params = useParams();
  const domainId = params.id as string;
  const { user, currentTenantId, getToken } = useAuth();

  const [domain, setDomain] = useState<Domain | null>(null);
  const [mailgunDomain, setMailgunDomain] = useState<MailgunDomain | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifyingMailgun, setIsVerifyingMailgun] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerificationExpanded, setIsVerificationExpanded] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    loadDomainDetails();
  }, [user, currentTenantId, domainId]);

  // Ensure verification section is collapsed by default when domain changes
  useEffect(() => {
    setIsVerificationExpanded(false);
  }, [domainId]);

  const loadDomainDetails = async () => {
    if (!user || !currentTenantId || !domainId) return;

    setIsLoading(true);
    setIsVerificationExpanded(false); // Reset to collapsed on load
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      // Load base domain
      const domainData = await domainCrudService.getDomain(domainId, currentTenantId, token);
      setDomain(domainData);

      // If connected to Mailgun, load Mailgun details
      if (domainData.connections.mailgun) {
        try {
          const mailgunDomains = await domainCrudService.getMailgunDomains(currentTenantId, token);
          const mailgunData = mailgunDomains.find(d => d.domainId === domainId);
          if (mailgunData) {
            setMailgunDomain(mailgunData);
          }
        } catch (error) {
          console.error('Error loading Mailgun details:', error);
        }
      }
    } catch (error) {
      console.error('Error loading domain:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load domain');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!currentTenantId || !domain) return;

    setIsVerifying(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const result = await domainCrudService.verifyDomain(domain.domainId, { tenantId: currentTenantId }, token);

      if (result.verified) {
        setSuccessMessage('Domain verified successfully!');
        await loadDomainDetails();
      } else {
        setErrorMessage(result.message || 'Verification failed. Please check your DNS records.');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify domain');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSyncMailgun = async () => {
    if (!currentTenantId || !domain) return;

    setIsSyncing(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      await domainCrudService.syncMailgunDomain(domain.domainId, currentTenantId, token);
      setSuccessMessage('Pulseline Email synced successfully!');
      await loadDomainDetails();
    } catch (error) {
      console.error('Error syncing Mailgun domain:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to sync Pulseline Email');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleVerifyMailgun = async () => {
    if (!currentTenantId || !domain) return;

    console.log('[FRONTEND] Starting Mailgun verification for domain:', domain.domainId);
    setIsVerifyingMailgun(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      console.log('[FRONTEND] Calling verifyMailgunDomain API...');
      const result = await domainCrudService.verifyMailgunDomain(domain.domainId, currentTenantId, token);
      console.log('[FRONTEND] Verification result:', result);

      if (result.verified) {
        setSuccessMessage('All Pulseline Email DNS records are valid!');
      } else if (result.sendingRecordsValid && !result.receivingRecordsValid) {
        setSuccessMessage('Sending records verified! Receiving records still pending.');
      } else {
        setErrorMessage('Some DNS records are not yet valid. Please check your DNS settings.');
      }

      console.log('[FRONTEND] Reloading domain details...');
      await loadDomainDetails();
    } catch (error) {
      console.error('[FRONTEND] Error verifying Mailgun DNS:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify DNS records');
    } finally {
      setIsVerifyingMailgun(false);
    }
  };

  const handleConnectToMailgun = async () => {
    if (!currentTenantId || !domain) return;

    setIsConnecting(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      await domainCrudService.connectToMailgun(
        { tenantId: currentTenantId, domainId: domain.domainId },
        token
      );

      setSuccessMessage('Connected to Pulseline Email successfully!');
      await loadDomainDetails();
    } catch (error) {
      console.error('Error connecting to Mailgun:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to Pulseline Email');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectFromMailgun = async () => {
    if (!currentTenantId || !domain) return;

    setIsDisconnecting(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      await domainCrudService.disconnectFromMailgun(domain.domainId, currentTenantId, token);

      setSuccessMessage('Disconnected from Pulseline Email successfully!');
      await loadDomainDetails();
    } catch (error) {
      console.error('Error disconnecting from Mailgun:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to disconnect from Pulseline Email');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getVerificationBadge = () => {
    const status = domain?.verification.status;
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          Verified
        </span>
      );
    } else if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <AlertCircle className="h-4 w-4" />
          Failed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <Shield className="h-4 w-4" />
          Pending
        </span>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-sm text-gray-600">Loading domain details...</p>
        </div>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Domain Not Found</h2>
          <p className="text-gray-600 mb-4">The domain you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/settings/domains')}
            className="btn-primary"
          >
            Back to Domains
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings/domains')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {domain.displayName || domain.domainId}
                </h1>
                {getVerificationBadge()}
              </div>
              <p className="text-sm text-gray-600">{domain.domainId}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Domain Verification Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Domain Verification</h2>
              {getVerificationBadge()}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleVerify}
                disabled={isVerifying || domain.verification.status === 'verified'}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Verify
                  </>
                )}
              </button>
              {domain.verification.status !== 'verified' && (
                <button
                  onClick={() => setIsVerificationExpanded(!isVerificationExpanded)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {isVerificationExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              )}
            </div>
          </div>

          {domain.verification.status === 'verified' && domain.verification.verifiedAt ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Domain verified on {new Date(domain.verification.verifiedAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <>
              {!isVerificationExpanded && (
                <p className="text-sm text-gray-600">
                  Click the arrow to view DNS verification instructions
                </p>
              )}

              {isVerificationExpanded && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">
                      Add this TXT record to your DNS:
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white p-3 rounded border border-blue-200">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">Name/Host:</p>
                          <code className="text-sm font-mono text-gray-900">@</code>
                        </div>
                        <button
                          onClick={() => copyToClipboard('@', 'name')}
                          className="p-2 hover:bg-gray-50 rounded"
                        >
                          {copiedField === 'name' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-white p-3 rounded border border-blue-200">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">Value:</p>
                          <code className="text-sm font-mono text-gray-900 break-all">
                            {domain.verification.verificationValue}
                          </code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(domain.verification.verificationValue || '', 'value')}
                          className="p-2 hover:bg-gray-50 rounded"
                        >
                          {copiedField === 'value' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-blue-700 mt-3">
                      DNS changes can take up to 48 hours to propagate. Click "Verify" once you've added the record.
                    </p>
                  </div>

                  {domain.verification.errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">{domain.verification.errorMessage}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pulseline Email Connection Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pulseline Email</h2>
            {domain.connections.mailgun ? (
              <button
                onClick={handleDisconnectFromMailgun}
                disabled={isDisconnecting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            ) : (
              <button
                onClick={handleConnectToMailgun}
                disabled={isConnecting || domain.verification.status !== 'verified'}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {isConnecting ? 'Connecting...' : 'Connect to Pulseline Email'}
              </button>
            )}
          </div>

          {domain.connections.mailgun ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-blue-50 border border-blue-200 rounded-lg">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Mail className="h-6 w-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Connected to Pulseline Email</h3>
                  <p className="text-sm text-gray-600">Email delivery service for {domain.domainId}</p>
                </div>
              </div>

              <MailgunVerificationStatus
                verification={mailgunDomain?.verification}
                onVerify={handleVerifyMailgun}
                isVerifying={isVerifyingMailgun}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">Not connected to Pulseline Email yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Connect your domain to send emails through Pulseline Email with your custom domain
              </p>
              {domain.verification.status !== 'verified' && (
                <p className="text-xs text-yellow-600 mb-4">
                  ⚠️ Domain must be verified first before connecting
                </p>
              )}
            </div>
          )}
        </div>

        {/* Domain Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Domain Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <dt className="text-sm text-gray-600">Domain:</dt>
              <dd className="text-sm font-medium text-gray-900">{domain.domainId}</dd>
            </div>
            {domain.dnsProvider && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-sm text-gray-600">DNS Provider:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md">
                    <Globe className="h-3.5 w-3.5" />
                    {domain.dnsProvider}
                  </span>
                </dd>
              </div>
            )}
            {domain.displayName && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-sm text-gray-600">Display Name:</dt>
                <dd className="text-sm font-medium text-gray-900">{domain.displayName}</dd>
              </div>
            )}
            {domain.description && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-sm text-gray-600">Description:</dt>
                <dd className="text-sm font-medium text-gray-900">{domain.description}</dd>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-gray-100">
              <dt className="text-sm text-gray-600">Primary Domain:</dt>
              <dd className="text-sm font-medium text-gray-900">
                {domain.isPrimary ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <dt className="text-sm text-gray-600">Created:</dt>
              <dd className="text-sm font-medium text-gray-900">
                {new Date(domain.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-sm text-gray-600">Last Updated:</dt>
              <dd className="text-sm font-medium text-gray-900">
                {new Date(domain.updatedAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Edit Modal */}
      <EditDomainModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={async (data) => {
          if (!currentTenantId || !domain) return;

          const token = await getToken();
          if (!token) throw new Error('Authentication required');

          await domainCrudService.updateDomain(
            domain.domainId,
            { ...data, tenantId: currentTenantId },
            token
          );

          setSuccessMessage('Domain updated successfully!');
          await loadDomainDetails();
        }}
        currentDisplayName={domain.displayName || ''}
        currentDescription={domain.description || ''}
        domainId={domain.domainId}
      />

      {/* Delete Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!currentTenantId || !domain) return;

          setIsDeleting(true);
          try {
            const token = await getToken();
            if (!token) throw new Error('Authentication required');

            await domainCrudService.deleteDomain(domain.domainId, currentTenantId, token);

            setSuccessMessage('Domain deleted successfully!');
            // Redirect to domains list after successful deletion
            setTimeout(() => router.push('/settings/domains'), 1000);
          } catch (error: any) {
            if (error.message?.includes('active connections') || error.code === 'ACTIVE_CONNECTIONS') {
              setErrorMessage(
                `Cannot delete domain with active connections. Please disconnect from Pulseline Email first, then try deleting again.`
              );
            } else {
              setErrorMessage(error instanceof Error ? error.message : 'Failed to delete domain');
            }
            setIsDeleteModalOpen(false);
          } finally {
            setIsDeleting(false);
          }
        }}
        itemName={domain.domainId}
        itemType="domain"
        isDeleting={isDeleting}
      />
    </div>
  );
}
