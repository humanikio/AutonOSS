'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  domainCrudService,
  Domain,
  CreateDomainRequest,
  UpdateDomainRequest,
} from './services/domainCrudService';
import {
  Plus,
  Edit,
  Trash2,
  X,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Globe,
  Mail,
  Shield,
  Copy,
  RefreshCw,
} from 'lucide-react';
import EditDomainModal from './components/EditDomainModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';

export default function DomainsPage() {
  const router = useRouter();
  const { currentTenantId, getToken } = useAuth();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState<CreateDomainRequest>({
    tenantId: currentTenantId || '',
    domainId: '',
    displayName: '',
    description: '',
    isPrimary: false,
  });

  // Copy feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Auto-clear messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Load domains on mount
  useEffect(() => {
    if (currentTenantId) {
      loadDomains();
    }
  }, [currentTenantId]);

  const loadDomains = async () => {
    if (!currentTenantId) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const result = await domainCrudService.getAllDomains(currentTenantId, token);
      setDomains(result.domains);
    } catch (error) {
      console.error('Error loading domains:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load domains');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDomain = async () => {
    if (!currentTenantId) return;

    if (!createForm.domainId) {
      setErrorMessage('Domain name is required');
      return;
    }

    setIsOperationLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await domainCrudService.createDomain(
        {
          ...createForm,
          tenantId: currentTenantId,
        },
        token
      );

      setSuccessMessage('Domain created successfully! Add the DNS TXT record to verify.');
      setIsCreateModalOpen(false);
      resetCreateForm();
      await loadDomains();
    } catch (error) {
      console.error('Error creating domain:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create domain');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!currentTenantId || !selectedDomain) return;

    setIsOperationLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const result = await domainCrudService.verifyDomain(
        selectedDomain.domainId,
        { tenantId: currentTenantId },
        token
      );

      if (result.verified) {
        setSuccessMessage('Domain verified successfully!');
        setIsVerifyModalOpen(false);
        setSelectedDomain(null);
        await loadDomains();
      } else {
        setErrorMessage(result.message || 'Domain verification failed. Please check your DNS records.');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify domain');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const openEditModal = (domain: Domain) => {
    setSelectedDomain(domain);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (domain: Domain) => {
    setSelectedDomain(domain);
    setIsDeleteModalOpen(true);
  };

  const openVerifyModal = (domain: Domain) => {
    setSelectedDomain(domain);
    setIsVerifyModalOpen(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      tenantId: currentTenantId || '',
      domainId: '',
      displayName: '',
      description: '',
      isPrimary: false,
    });
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getStatusBadge = (domain: Domain) => {
    const status = domain.verification.status;

    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </span>
      );
    } else if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="h-3 w-3" />
          Failed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Shield className="h-3 w-3" />
          Pending
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Domain Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Connect and verify your custom domains to send emails via Pulseline Mail
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetCreateForm();
              setIsCreateModalOpen(true);
              setErrorMessage('');
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Domain
          </button>
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
      <div className="px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : domains.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No domains yet</p>
            <button
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(true);
                setErrorMessage('');
              }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Your First Domain
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Connections
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {domains.map((domain) => (
                  <tr
                    key={domain.domainId}
                    onClick={() => router.push(`/settings/domains/manage/${encodeURIComponent(domain.domainId)}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {domain.displayName || domain.domainId}
                          </div>
                          {domain.displayName && (
                            <div className="text-sm text-gray-500 font-mono">{domain.domainId}</div>
                          )}
                        </div>
                        {domain.isPrimary && (
                          <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Primary
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(domain)}
                      {domain.verification.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openVerifyModal(domain);
                          }}
                          className="ml-2 text-xs text-primary-600 hover:text-primary-900"
                        >
                          Verify Now
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {domain.connections.mailgun ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Pulseline Email
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Not Connected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(domain);
                        }}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(domain);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add Domain</h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setErrorMessage('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.domainId}
                  onChange={(e) => setCreateForm({ ...createForm, domainId: e.target.value })}
                  placeholder="e.g., mybusiness.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  <strong>✓ Auto-extraction enabled:</strong> Enter any format - we'll automatically extract the root domain
                  <ul className="mt-1 ml-4 list-disc space-y-0.5">
                    <li><span className="font-mono">www.example.com</span> → <span className="font-mono">example.com</span></li>
                    <li><span className="font-mono">app.example.com</span> → <span className="font-mono">example.com</span></li>
                    <li><span className="font-mono">https://example.com</span> → <span className="font-mono">example.com</span></li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                  placeholder="e.g., My Business"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={createForm.isPrimary}
                  onChange={(e) => setCreateForm({ ...createForm, isPrimary: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isPrimary" className="text-sm text-gray-700">
                  Set as primary domain
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setErrorMessage('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDomain}
                disabled={isOperationLoading || !createForm.domainId}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {isOperationLoading ? 'Creating...' : 'Create Domain'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {isVerifyModalOpen && selectedDomain && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Verify Domain</h2>
              <button
                onClick={() => {
                  setIsVerifyModalOpen(false);
                  setSelectedDomain(null);
                  setErrorMessage('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-900 mb-1">
                      Add DNS TXT Record
                    </h3>
                    <p className="text-sm text-blue-800">
                      Add this TXT record to your domain's DNS settings to verify ownership.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Record Type
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value="TXT"
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Host / Name
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value="@"
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard('@', 'host')}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'host' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Use @ or leave blank (or use your domain name depending on your DNS provider)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedDomain.verification.verificationValue || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm"
                    />
                    <button
                      onClick={() =>
                        copyToClipboard(
                          selectedDomain.verification.verificationValue || '',
                          'value'
                        )
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'value' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Next Steps:</h3>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Log in to your domain registrar or DNS provider (e.g., GoDaddy, Cloudflare, Namecheap)</li>
                  <li>Navigate to DNS settings or DNS management</li>
                  <li>Add a new TXT record with the values shown above</li>
                  <li className="font-medium text-amber-700">
                    Wait for DNS propagation (typically 5-30 minutes, max 48 hours)
                  </li>
                  <li>Click "Verify Now" below to check verification status</li>
                </ol>

                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-xs text-gray-600">
                    💡 <strong>Tip:</strong> Each domain has a unique verification code for security.
                    You can check DNS propagation at{' '}
                    <a
                      href={`https://dnschecker.org/#TXT/${selectedDomain.domainId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      dnschecker.org
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsVerifyModalOpen(false);
                  setSelectedDomain(null);
                  setErrorMessage('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleVerifyDomain}
                disabled={isOperationLoading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isOperationLoading ? 'animate-spin' : ''}`} />
                {isOperationLoading ? 'Verifying...' : 'Verify Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditDomainModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDomain(null);
        }}
        onSave={async (data) => {
          if (!currentTenantId || !selectedDomain) return;

          const token = await getToken();
          if (!token) throw new Error('Authentication required');

          await domainCrudService.updateDomain(
            selectedDomain.domainId,
            { ...data, tenantId: currentTenantId },
            token
          );

          setSuccessMessage('Domain updated successfully!');
          setSelectedDomain(null);
          await loadDomains();
        }}
        currentDisplayName={selectedDomain?.displayName}
        currentDescription={selectedDomain?.description}
        domainId={selectedDomain?.domainId || ''}
      />

      {/* Delete Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDomain(null);
        }}
        onConfirm={async () => {
          if (!currentTenantId || !selectedDomain) return;

          try {
            const token = await getToken();
            if (!token) throw new Error('Authentication required');

            await domainCrudService.deleteDomain(selectedDomain.domainId, currentTenantId, token);

            setSuccessMessage('Domain deleted successfully!');
            setIsDeleteModalOpen(false);
            setSelectedDomain(null);
            await loadDomains();
          } catch (error: any) {
            if (error.message?.includes('active connections') || error.code === 'ACTIVE_CONNECTIONS') {
              setErrorMessage(
                `Cannot delete domain with active connections. Please disconnect from Pulseline Email first, then try deleting again.`
              );
            } else {
              setErrorMessage(error instanceof Error ? error.message : 'Failed to delete domain');
            }
            setIsDeleteModalOpen(false);
          }
        }}
        itemName={selectedDomain?.domainId || ''}
        itemType="domain"
        isDeleting={isOperationLoading}
      />
    </div>
  );
}
