'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, X, FileText, AlertCircle, CheckCircle, Download, ArrowRight } from 'lucide-react';

export interface CSVField {
  name: string;
  sampleValues: string[];
}

export interface FieldMapping {
  csvField: string;
  contactField: string;
}

interface BulkUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CONTACT_FIELDS = [
  { value: 'name', label: 'Full Name' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email Address' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'dateOfBirth', label: 'Date of Birth' },
];

export default function BulkUpload({ onClose, onSuccess }: BulkUploadProps) {
  const { tenant, getToken } = useAuth();
  const [step, setStep] = useState<'upload' | 'mapping' | 'processing'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvFields, setCsvFields] = useState<CSVField[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile && uploadedFile.type === 'text/csv') {
      setFile(uploadedFile);
      setError(null);
    } else {
      setError('Please upload a CSV file only');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleProcessCSV = async () => {
    if (!file || !tenant?.id) return;

    setIsProcessing(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const formData = new FormData();
      formData.append('csvFile', file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/contacts/bulk-upload/step1`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setCsvFields(result.fields);
        
        // Initialize mappings with empty values
        setFieldMappings(result.fields.map((field: CSVField) => ({
          csvField: field.name,
          contactField: ''
        })));
        
        setStep('mapping');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to process CSV file');
      }
    } catch (error) {
      console.error('Error processing CSV:', error);
      setError('Failed to process CSV file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateMapping = (csvField: string, contactField: string) => {
    setFieldMappings(prev =>
      prev.map(mapping =>
        mapping.csvField === csvField
          ? { ...mapping, contactField }
          : mapping
      )
    );
  };

  const handleBulkCreate = async () => {
    if (!tenant?.id || !file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('fieldMappings', JSON.stringify(fieldMappings));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/contacts/bulk-upload/step2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResults(result);
        setStep('processing');
        
        // Call onSuccess to refresh the contacts list
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create contacts');
      }
    } catch (error) {
      console.error('Error creating contacts:', error);
      setError('Failed to create contacts');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'],
      ['John', 'Doe', 'john.doe@example.com', '+1234567890', '1990-01-15'],
      ['Jane', 'Smith', 'jane.smith@example.com', '+0987654321', '1985-05-20'],
      ['Bob', 'Johnson', 'bob.johnson@example.com', '+1122334455', '1992-12-03']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'sample-contacts.csv');
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-full">
              <Upload className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Bulk Upload Contacts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isProcessing}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: File Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Upload a CSV file with your contacts. We'll help you map the fields to match our system.
                </p>
                <button
                  onClick={downloadSampleCSV}
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 mb-6"
                >
                  <Download className="h-4 w-4" />
                  Download Sample CSV
                </button>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragActive
                    ? 'border-indigo-500 bg-indigo-50'
                    : file
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="text-lg font-medium text-green-700">File Selected</p>
                    <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                      <FileText className="h-4 w-4" />
                      {file.name}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-lg font-medium text-gray-700">
                      {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here'}
                    </p>
                    <p className="text-sm text-gray-500">or click to select a file</p>
                  </div>
                )}
              </div>

              {file && (
                <div className="flex justify-end">
                  <button
                    onClick={handleProcessCSV}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        Next: Map Fields
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Field Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Map CSV Fields</h3>
                <p className="text-gray-600">
                  Match your CSV columns to our contact fields. Leave unmapped if not needed.
                </p>
              </div>

              <div className="space-y-4">
                {csvFields.map((csvField) => (
                  <div key={csvField.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{csvField.name}</h4>
                      <select
                        value={fieldMappings.find(m => m.csvField === csvField.name)?.contactField || ''}
                        onChange={(e) => handleUpdateMapping(csvField.name, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Don't map this field</option>
                        {CONTACT_FIELDS.map(field => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Sample values:</strong> {csvField.sampleValues.join(', ')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleBulkCreate}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Contacts...
                    </>
                  ) : (
                    <>
                      Create Contacts
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 'processing' && uploadResults && (
            <div className="space-y-6 text-center">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Complete!</h3>
                <div className="space-y-2">
                  <p className="text-green-600">
                    <strong>{uploadResults.success}</strong> contacts created successfully
                  </p>
                  {uploadResults.failed > 0 && (
                    <p className="text-red-600">
                      <strong>{uploadResults.failed}</strong> contacts failed to create
                    </p>
                  )}
                </div>
              </div>

              {uploadResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                  <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {uploadResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}