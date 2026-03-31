'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight, Copy, RefreshCw } from 'lucide-react';

interface DnsRecord {
  record_type: string;
  valid: string;
  name: string;
  value: string;
  priority?: string;
  is_active?: boolean;
}

interface MailgunVerificationStatusProps {
  verification?: {
    lastVerified: Date;
    allRecordsValid: boolean;
    sendingRecordsValid: boolean;
    receivingRecordsValid: boolean;
    sendingRecords: DnsRecord[];
    receivingRecords: DnsRecord[];
    state: string;
  };
  onVerify: () => Promise<void>;
  isVerifying: boolean;
}

export default function MailgunVerificationStatus({
  verification,
  onVerify,
  isVerifying
}: MailgunVerificationStatusProps) {
  const [sendingExpanded, setSendingExpanded] = useState(false);
  const [receivingExpanded, setReceivingExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Extract short hostname by removing the root domain
  const getShortHostname = (fullName: string): string => {
    // Examples:
    // mx._domainkey.humanik.io -> mx._domainkey
    // email.humanik.io -> email
    // humanik.io -> @ (handled elsewhere)
    const parts = fullName.split('.');
    if (parts.length <= 2) return '@'; // Root domain

    // Remove last 2 parts (domain.tld)
    return parts.slice(0, -2).join('.');
  };

  if (!verification) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">
            No verification data available. Click "Verify" to check DNS records.
          </p>
          <button
            onClick={onVerify}
            disabled={isVerifying}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Verify DNS Records
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const {
    lastVerified,
    allRecordsValid,
    sendingRecordsValid,
    receivingRecordsValid,
    sendingRecords,
    receivingRecords
  } = verification;

  // Count fully verified records (valid === 'valid')
  const sendingVerifiedCount = sendingRecords.filter(r => r.valid === 'valid').length;
  const receivingVerifiedCount = receivingRecords.filter(r => r.valid === 'valid').length;

  // Count configured records (valid OR active in DNS)
  const sendingConfiguredCount = sendingRecords.filter(r =>
    r.valid === 'valid' || (r.valid === 'unknown' && r.is_active)
  ).length;
  const receivingConfiguredCount = receivingRecords.filter(r =>
    r.valid === 'valid' || (r.valid === 'unknown' && r.is_active)
  ).length;

  const getRecordBadge = (record: DnsRecord) => {
    if (record.valid === 'valid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </span>
      );
    } else if (record.valid === 'invalid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
          <XCircle className="h-3 w-3" />
          Invalid
        </span>
      );
    } else if (record.valid === 'unknown' && record.is_active) {
      // DNS is configured but Mailgun hasn't fully validated yet
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
          <AlertCircle className="h-3 w-3" />
          Configured
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
          <AlertCircle className="h-3 w-3" />
          Pending
        </span>
      );
    }
  };

  const formatLastVerified = () => {
    const now = new Date();
    const diff = now.getTime() - new Date(lastVerified).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* DNS Provider Format Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">DNS Provider Formats</h4>
            <p className="text-xs text-blue-800 mb-2">
              Different DNS providers require different hostname formats. We show both formats for each record:
            </p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>
                <strong className="font-semibold">Full format:</strong> Use with Vercel, Google Domains, AWS Route53
              </li>
              <li>
                <strong className="font-semibold">Short format (RECOMMENDED):</strong> Use with Namecheap, Cloudflare, GoDaddy - these providers auto-append your domain
              </li>
            </ul>
            <p className="text-xs text-blue-700 mt-2 font-medium">
              💡 Tip: If one format doesn't work, try the other!
            </p>
          </div>
        </div>
      </div>

      {/* Header with overall status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Pulseline Email DNS Verification
          </h3>
          <p className="text-sm text-gray-600">
            Last verified: {formatLastVerified()}
          </p>
        </div>
        <button
          onClick={onVerify}
          disabled={isVerifying}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
          {isVerifying ? 'Verifying...' : 'Verify Now'}
        </button>
      </div>

      {/* Overall status */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${allRecordsValid ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            {allRecordsValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            <span className="text-sm font-medium text-gray-900">All Records</span>
          </div>
          <p className="text-xs text-gray-600">
            {allRecordsValid ? 'Fully verified' : 'Partially verified'}
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${
          sendingRecordsValid ? 'bg-green-50 border-green-200' :
          (sendingConfiguredCount === sendingRecords.length ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200')
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {sendingRecordsValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : sendingConfiguredCount === sendingRecords.length ? (
              <AlertCircle className="h-5 w-5 text-blue-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className="text-sm font-medium text-gray-900">Sending</span>
          </div>
          <p className="text-xs text-gray-600">
            {sendingVerifiedCount}/{sendingRecords.length} verified
            {sendingConfiguredCount > sendingVerifiedCount && (
              <span className="text-blue-600"> ({sendingConfiguredCount} configured)</span>
            )}
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${
          receivingRecordsValid ? 'bg-green-50 border-green-200' :
          (receivingConfiguredCount === receivingRecords.length ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200')
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {receivingRecordsValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : receivingConfiguredCount === receivingRecords.length ? (
              <AlertCircle className="h-5 w-5 text-blue-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className="text-sm font-medium text-gray-900">Receiving</span>
          </div>
          <p className="text-xs text-gray-600">
            {receivingVerifiedCount}/{receivingRecords.length} verified
            {receivingConfiguredCount > receivingVerifiedCount && (
              <span className="text-blue-600"> ({receivingConfiguredCount} configured)</span>
            )}
          </p>
        </div>
      </div>

      {/* Sending Records */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setSendingExpanded(!sendingExpanded)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            {sendingExpanded ? <ChevronDown className="h-5 w-5 text-gray-600" /> : <ChevronRight className="h-5 w-5 text-gray-600" />}
            <h4 className="font-medium text-gray-900">
              Sending Records ({sendingVerifiedCount}/{sendingRecords.length} verified
              {sendingConfiguredCount > sendingVerifiedCount && (
                <span className="text-blue-600">, {sendingConfiguredCount} configured</span>
              )})
            </h4>
          </div>
          {sendingRecordsValid ? (
            getRecordBadge({ valid: 'valid' } as DnsRecord)
          ) : sendingConfiguredCount === sendingRecords.length ? (
            getRecordBadge({ valid: 'unknown', is_active: true } as DnsRecord)
          ) : (
            getRecordBadge({ valid: 'invalid' } as DnsRecord)
          )}
        </button>

        {sendingExpanded && (
          <div className="p-4 space-y-3">
            {sendingRecords.map((record, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {record.record_type} Record
                  </span>
                  {getRecordBadge(record)}
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gray-600">Name/Host:</p>
                      <div className="group relative">
                        <AlertCircle className="h-3 w-3 text-blue-500 cursor-help" />
                        <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg -top-2 left-5">
                          Different DNS providers use different formats. Try both if one doesn't work.
                        </div>
                      </div>
                    </div>

                    {/* Full FQDN Format */}
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Full format (Vercel, Google Domains, Route53):</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono bg-gray-100 px-2 py-1 rounded break-all">
                          {record.name || '@'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(record.name || '@', `sending-${index}-name-full`)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Copy full format"
                        >
                          {copiedField === `sending-${index}-name-full` ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Short Format (only if not root domain) */}
                    {record.name && record.name !== '@' && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Short format (Namecheap, Cloudflare, GoDaddy):</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono bg-blue-50 px-2 py-1 rounded break-all border border-blue-200">
                            {getShortHostname(record.name)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(getShortHostname(record.name), `sending-${index}-name-short`)}
                            className="p-1 hover:bg-blue-100 rounded"
                            title="Copy short format"
                          >
                            {copiedField === `sending-${index}-name-short` ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-blue-600" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          → Most providers auto-append your domain. Try this first!
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Value:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono bg-gray-100 px-2 py-1 rounded break-all">
                        {record.value}
                      </code>
                      <button
                        onClick={() => copyToClipboard(record.value, `sending-${index}-value`)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {copiedField === `sending-${index}-value` ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                  {record.priority && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Priority:</p>
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {record.priority}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receiving Records */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setReceivingExpanded(!receivingExpanded)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            {receivingExpanded ? <ChevronDown className="h-5 w-5 text-gray-600" /> : <ChevronRight className="h-5 w-5 text-gray-600" />}
            <h4 className="font-medium text-gray-900">
              Receiving Records ({receivingVerifiedCount}/{receivingRecords.length} verified
              {receivingConfiguredCount > receivingVerifiedCount && (
                <span className="text-blue-600">, {receivingConfiguredCount} configured</span>
              )})
            </h4>
          </div>
          {receivingRecordsValid ? (
            getRecordBadge({ valid: 'valid' } as DnsRecord)
          ) : receivingConfiguredCount === receivingRecords.length ? (
            getRecordBadge({ valid: 'unknown', is_active: true } as DnsRecord)
          ) : (
            getRecordBadge({ valid: 'invalid' } as DnsRecord)
          )}
        </button>

        {receivingExpanded && (
          <div className="p-4 space-y-3">
            {receivingRecords.map((record, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {record.record_type} Record
                  </span>
                  {getRecordBadge(record)}
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gray-600">Name/Host:</p>
                      <div className="group relative">
                        <AlertCircle className="h-3 w-3 text-blue-500 cursor-help" />
                        <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg -top-2 left-5">
                          Different DNS providers use different formats. Try both if one doesn't work.
                        </div>
                      </div>
                    </div>

                    {/* Full FQDN Format */}
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Full format (Vercel, Google Domains, Route53):</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono bg-gray-100 px-2 py-1 rounded break-all">
                          {record.name || '@'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(record.name || '@', `receiving-${index}-name-full`)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Copy full format"
                        >
                          {copiedField === `receiving-${index}-name-full` ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Short Format (only if not root domain) */}
                    {record.name && record.name !== '@' && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Short format (Namecheap, Cloudflare, GoDaddy):</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono bg-blue-50 px-2 py-1 rounded break-all border border-blue-200">
                            {getShortHostname(record.name)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(getShortHostname(record.name), `receiving-${index}-name-short`)}
                            className="p-1 hover:bg-blue-100 rounded"
                            title="Copy short format"
                          >
                            {copiedField === `receiving-${index}-name-short` ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-blue-600" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          → Most providers auto-append your domain. Try this first!
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Value:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono bg-gray-100 px-2 py-1 rounded break-all">
                        {record.value}
                      </code>
                      <button
                        onClick={() => copyToClipboard(record.value, `receiving-${index}-value`)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {copiedField === `receiving-${index}-value` ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                  {record.priority && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Priority:</p>
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {record.priority}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!allRecordsValid && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            DNS changes can take up to 48 hours to propagate. If you've just added these records,
            please check back later or click "Verify Now" to re-check.
          </p>
        </div>
      )}
    </div>
  );
}
