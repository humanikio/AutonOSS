'use client';

import { useState, useEffect } from 'react';
import { Copy, RefreshCw, Check, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface WebhookTriggerConfigProps {
  workflowId: string;
  productionUrl?: string; // From workflow triggers array in Firestore
  onSave: (parameters: Record<string, any>) => void;
}

export function WebhookTriggerConfig({
  workflowId,
  productionUrl,
  onSave,
}: WebhookTriggerConfigProps) {
  const { getToken, currentTenantId } = useAuth();
  const [testUrl, setTestUrl] = useState<string | null>(null);
  const [loadingTestUrl, setLoadingTestUrl] = useState(false);
  const [generatingTestUrl, setGeneratingTestUrl] = useState(false);
  const [copiedProd, setCopiedProd] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active test URL on mount
  useEffect(() => {
    loadActiveTestUrl();
  }, [workflowId]);

  const loadActiveTestUrl = async () => {
    setLoadingTestUrl(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiUrl}/api/workflows/inbound-events/${workflowId}/test-url`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': currentTenantId || '',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.fullUrl) {
          setTestUrl(result.fullUrl);
        }
      } else if (response.status !== 404) {
        // 404 means no test URL exists yet, which is fine
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load test URL');
      }
    } catch (error) {
      console.error('Error loading test URL:', error);
      setError('Failed to load test URL');
    } finally {
      setLoadingTestUrl(false);
    }
  };

  const generateTestUrl = async () => {
    setGeneratingTestUrl(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiUrl}/api/workflows/inbound-events/${workflowId}/generate-test-url`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': currentTenantId || '',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.fullUrl) {
          setTestUrl(result.fullUrl);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to generate test URL');
      }
    } catch (error) {
      console.error('Error generating test URL:', error);
      setError('Failed to generate test URL');
    } finally {
      setGeneratingTestUrl(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'prod' | 'test') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'prod') {
        setCopiedProd(true);
        setTimeout(() => setCopiedProd(false), 2000);
      } else {
        setCopiedTest(true);
        setTimeout(() => setCopiedTest(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Inbound Webhook</h3>
        <p className="text-sm text-gray-600">
          Your workflow will be triggered when a webhook request is received at these URLs.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Production URL */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Production Webhook URL</h4>
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">
            LIVE
          </span>
        </div>

        {productionUrl ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <code className="text-sm text-gray-700 break-all">{productionUrl}</code>
            </div>
            <button
              onClick={() => copyToClipboard(productionUrl, 'prod')}
              className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {copiedProd ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              Production URL will be available after workflow is activated
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500">
          This URL will trigger your live workflow. Use this in your production integrations.
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Test URL */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Test Webhook URL</h4>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md font-medium">
            TESTING
          </span>
        </div>

        {loadingTestUrl ? (
          <div className="px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
          </div>
        ) : testUrl ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                <code className="text-sm text-gray-700 break-all">{testUrl}</code>
              </div>
              <button
                onClick={() => copyToClipboard(testUrl, 'test')}
                className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                {copiedTest ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-600" />
                )}
              </button>
              <button
                onClick={generateTestUrl}
                disabled={generatingTestUrl}
                className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate new test URL"
              >
                <RefreshCw
                  className={`h-4 w-4 text-gray-600 ${
                    generatingTestUrl ? 'animate-spin' : ''
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Send test webhooks to this URL to map fields and test your workflow. Generating a new
              URL will overwrite the previous one.
            </p>
          </>
        ) : (
          <div className="space-y-3">
            <div className="px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
              <p className="text-sm text-gray-600">No test URL generated yet</p>
            </div>
            <button
              onClick={generateTestUrl}
              disabled={generatingTestUrl}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generatingTestUrl ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Generate Test URL
                </>
              )}
            </button>
            <p className="text-xs text-gray-500">
              Generate a test URL to receive sample webhook payloads for field mapping.
            </p>
          </div>
        )}
      </div>

      {/* TODO: Add Field Mapping section when test payload is received */}
    </div>
  );
}
