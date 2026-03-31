import apiClient from './client';
import { ApiResponse } from '@/types';

// Knowledge Base Document Types
export interface KBDocument {
  id: string;
  title: string;
  description: string;
  content: string;
  type: 'policy' | 'procedure' | 'guide' | 'script' | 'reference';
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  tenantId: string;
}

export interface CreateDocumentRequest {
  title: string;
  content: string;
  type?: 'policy' | 'procedure' | 'guide' | 'script' | 'reference';
  description?: string;
  tags?: string[];
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  type?: 'policy' | 'procedure' | 'guide' | 'script' | 'reference';
  description?: string;
  tags?: string[];
}

// ===== KB DOCUMENTS API FUNCTIONS =====

// Load a document by ID
export const loadDocument = async (docId: string): Promise<KBDocument | null> => {
  try {
    const response = await apiClient.get<ApiResponse<KBDocument>>(`/api/kb/documents/${docId}`);
    return response.data.data || null;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// Create a new document
export const createDocument = async (data: CreateDocumentRequest): Promise<KBDocument> => {
  const response = await apiClient.post<ApiResponse<KBDocument>>('/api/kb/documents', data);
  return response.data.data!;
};

// Update an existing document
export const updateDocument = async (docId: string, data: UpdateDocumentRequest): Promise<KBDocument> => {
  const response = await apiClient.put<ApiResponse<KBDocument>>(`/api/kb/documents/${docId}`, data);
  return response.data.data!;
};

// Delete a document
export const deleteDocument = async (docId: string): Promise<void> => {
  await apiClient.delete(`/api/kb/documents/${docId}`);
};

// List all documents for the authenticated user's tenant
export const listDocuments = async (): Promise<KBDocument[]> => {
  const response = await apiClient.get<ApiResponse<KBDocument[]>>('/api/kb/documents');
  return response.data.data || [];
};

// Special function to handle baseline document
export const getBaselineDocument = async (): Promise<KBDocument | null> => {
  // Try to load baseline document, if it doesn't exist, return null
  return await loadDocument('baseline');
};

// Create a baseline document (empty)
export const createBaselineDocument = async (): Promise<KBDocument> => {
  return await createDocument({
    title: 'Company Baseline Document',
    content: '',
    type: 'reference',
    description: 'Essential company information for AI agent training',
    tags: ['baseline', 'company-info', 'training']
  });
};