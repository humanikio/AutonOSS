import apiClient from './client';
import { BusinessInfo, Product, FAQ, BrandGuidelines, ApiResponse } from '@/types';

export const knowledgeAPI = {
  // Business Info
  getBusinessInfo: async (): Promise<BusinessInfo | null> => {
    const response = await apiClient.get<ApiResponse<BusinessInfo>>('/api/knowledge/business-info');
    return response.data.data || null;
  },

  updateBusinessInfo: async (data: Partial<BusinessInfo>): Promise<BusinessInfo> => {
    const response = await apiClient.put<ApiResponse<BusinessInfo>>('/api/knowledge/business-info', data);
    return response.data.data!;
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    const response = await apiClient.get<ApiResponse<Product[]>>('/api/knowledge/products');
    return response.data.data || [];
  },

  createProduct: async (data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.post<ApiResponse<Product>>('/api/knowledge/products', data);
    return response.data.data!;
  },

  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.put<ApiResponse<Product>>(`/api/knowledge/products/${id}`, data);
    return response.data.data!;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/knowledge/products/${id}`);
  },

  // FAQs
  getFAQs: async (): Promise<FAQ[]> => {
    const response = await apiClient.get<ApiResponse<FAQ[]>>('/api/knowledge/faqs');
    return response.data.data || [];
  },

  createFAQ: async (data: Partial<FAQ>): Promise<FAQ> => {
    const response = await apiClient.post<ApiResponse<FAQ>>('/api/knowledge/faqs', data);
    return response.data.data!;
  },

  updateFAQ: async (id: string, data: Partial<FAQ>): Promise<FAQ> => {
    const response = await apiClient.put<ApiResponse<FAQ>>(`/api/knowledge/faqs/${id}`, data);
    return response.data.data!;
  },

  deleteFAQ: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/knowledge/faqs/${id}`);
  },

  // Brand Guidelines
  getBrandGuidelines: async (): Promise<BrandGuidelines | null> => {
    const response = await apiClient.get<ApiResponse<BrandGuidelines>>('/api/knowledge/brand-guidelines');
    return response.data.data || null;
  },

  updateBrandGuidelines: async (data: Partial<BrandGuidelines>): Promise<BrandGuidelines> => {
    const response = await apiClient.put<ApiResponse<BrandGuidelines>>('/api/knowledge/brand-guidelines', data);
    return response.data.data!;
  }
};