/**
 * WebhookExamplePayload
 *
 * Formatted JSON payload display with copy functionality.
 */

'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface WebhookExamplePayloadProps {
  payload: object;
  title?: string;
}

export default function WebhookExamplePayload({
  payload,
  title = 'Example Payload',
}: WebhookExamplePayloadProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-slate-600 uppercase tracking-wide">
          {title}
        </h4>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" />
              <span className="text-emerald-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="relative">
        <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
          <code>{JSON.stringify(payload, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}
