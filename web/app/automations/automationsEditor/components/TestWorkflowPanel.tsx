'use client';

import { useState } from 'react';
import { X, Play, Loader2, Plus, Trash2, User, Mail, Phone } from 'lucide-react';
import ContactSelectionModal from './ContactSelectionModal';

interface TestWorkflowPanelProps {
  workflowId: string;
  onClose: () => void;
  getToken: () => Promise<string | null>;
  currentTenantId: string | null;
}

type PayloadMode = 'contact' | 'passthrough' | 'json' | 'fields';

interface FieldPair {
  name: string;
  value: string;
}

export default function TestWorkflowPanel({
  workflowId,
  onClose,
  getToken,
  currentTenantId,
}: TestWorkflowPanelProps) {
  const [payloadMode, setPayloadMode] = useState<PayloadMode>('contact');
  const [jsonPayload, setJsonPayload] = useState('{\n  \n}');
  const [fieldPairs, setFieldPairs] = useState<FieldPair[]>([{ name: '', value: '' }]);
  const [selectedContact, setSelectedContact] = useState<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    executionId?: string;
    error?: string;
  } | null>(null);

  const handleAddField = () => {
    setFieldPairs([...fieldPairs, { name: '', value: '' }]);
  };

  const handleRemoveField = (index: number) => {
    setFieldPairs(fieldPairs.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: 'name' | 'value', value: string) => {
    const updated = [...fieldPairs];
    updated[index][field] = value;
    setFieldPairs(updated);
  };

  const buildPayload = () => {
    if (payloadMode === 'contact') {
      if (!selectedContact) {
        throw new Error('Please select a contact');
      }
      return { contactId: selectedContact.id };
    } else if (payloadMode === 'passthrough') {
      return {};
    } else if (payloadMode === 'json') {
      try {
        return JSON.parse(jsonPayload);
      } catch (error) {
        throw new Error('Invalid JSON format');
      }
    } else if (payloadMode === 'fields') {
      const payload: Record<string, any> = {};
      fieldPairs.forEach(({ name, value }) => {
        if (name.trim()) {
          // Try to parse as JSON, otherwise use as string
          try {
            payload[name] = JSON.parse(value);
          } catch {
            payload[name] = value;
          }
        }
      });
      return payload;
    }
    return {};
  };

  const handleTest = async () => {
    if (!currentTenantId) {
      setResult({
        success: false,
        error: 'No tenant selected. Please switch to a tenant first.',
      });
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }

      const payload = buildPayload();

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/workflows/workflows/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          workflowId,
          payload,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.data?.message || 'Workflow triggered successfully',
          executionId: data.data?.executionId,
        });
      } else {
        setResult({
          success: false,
          error: data.error || data.message || 'Failed to trigger workflow',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'An unexpected error occurred',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 z-40"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white border-l border-gray-200 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Test Workflow</h2>
            <p className="text-sm text-gray-500">Configure and test your workflow</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Payload Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payload Mode
            </label>
            <select
              value={payloadMode}
              onChange={(e) => {
                setPayloadMode(e.target.value as PayloadMode);
                // Clear selectedContact when switching away from contact mode
                if (e.target.value !== 'contact') {
                  setSelectedContact(null);
                }
              }}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="contact">Contact</option>
              <option value="passthrough">Pass Through (Empty)</option>
              <option value="json">Raw JSON</option>
              <option value="fields">Field-Value Pairs</option>
            </select>
          </div>

          {/* Contact Mode */}
          {payloadMode === 'contact' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Contact
              </label>

              {selectedContact ? (
                // Show selected contact with option to change
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {selectedContact.name}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                      {selectedContact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedContact.email}
                        </span>
                      )}
                      {selectedContact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedContact.phone}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Contact ID: {selectedContact.id}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                // Show button to select contact
                <button
                  onClick={() => setShowContactModal(true)}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Select Contact
                </button>
              )}

              {/* Preview payload */}
              {selectedContact && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1 font-medium">
                    Payload Preview:
                  </div>
                  <code className="text-xs text-gray-800 font-mono">
                    {JSON.stringify({ contactId: selectedContact.id }, null, 2)}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Raw JSON Mode */}
          {payloadMode === 'json' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JSON Payload
              </label>
              <textarea
                value={jsonPayload}
                onChange={(e) => setJsonPayload(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder='{\n  "key": "value"\n}'
              />
            </div>
          )}

          {/* Field-Value Pairs Mode */}
          {payloadMode === 'fields' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Payload Fields
                </label>
                <button
                  onClick={handleAddField}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Field
                </button>
              </div>
              <div className="space-y-2">
                {fieldPairs.map((field, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Field name"
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Value (supports ={{  }} expressions)"
                        value={field.value}
                        onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {fieldPairs.length > 1 && (
                      <button
                        onClick={() => handleRemoveField(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div
              className={`p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <h3
                    className={`text-sm font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {result.success ? 'Success' : 'Error'}
                  </h3>
                  <p
                    className={`text-sm mt-1 ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {result.success ? result.message : result.error}
                  </p>
                  {result.executionId && (
                    <p className="text-xs text-green-600 mt-2 font-mono">
                      Execution ID: {result.executionId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={handleTest}
            disabled={testing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Test Workflow
              </>
            )}
          </button>
        </div>
      </div>

      {/* Contact Selection Modal */}
      {showContactModal && (
        <ContactSelectionModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          onSelectContact={(contact) => {
            setSelectedContact(contact);
            setShowContactModal(false);
          }}
        />
      )}
    </>
  );
}
