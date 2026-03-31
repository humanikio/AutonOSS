import axios, { AxiosResponse } from 'axios';
import { 
  BusinessInfo, 
  BusinessInfoRequest,
  Product,
  ProductRequest,
  FAQ,
  FAQRequest,
  BrandGuidelines,
  BrandGuidelinesRequest,
  ApiResponse 
} from '@/types';

// Global token getter function - will be set by components that have auth context
let getAuthToken: (() => Promise<string | null>) | null = null;

// Function to set the token getter (called from components with auth context)
export const setTokenGetter = (tokenGetter: () => Promise<string | null>) => {
  getAuthToken = tokenGetter;
};

// Create axios instance
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 120000, // 2 minutes for very slow systems
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Firebase Auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      if (getAuthToken) {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      // Firebase will handle auth state through onAuthStateChanged
      // Don't redirect here as it might interfere with the auth flow
      console.error('API request unauthorized:', error);
    }
    
    return Promise.reject(error);
  }
);

// ===== KNOWLEDGE HUB API FUNCTIONS =====

// Business Info
export const getBusinessInfo = async (): Promise<BusinessInfo | null> => {
  const response = await apiClient.get<ApiResponse<BusinessInfo>>('/api/knowledge/business-info');
  return response.data.data || null;
};

export const updateBusinessInfo = async (data: BusinessInfoRequest): Promise<BusinessInfo> => {
  const response = await apiClient.put<ApiResponse<BusinessInfo>>('/api/knowledge/business-info', data);
  return response.data.data!;
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  const response = await apiClient.get<ApiResponse<Product[]>>('/api/knowledge/products');
  return response.data.data || [];
};

export const createProduct = async (data: ProductRequest): Promise<Product> => {
  const response = await apiClient.post<ApiResponse<Product>>('/api/knowledge/products', data);
  return response.data.data!;
};

export const updateProduct = async (id: string, data: ProductRequest): Promise<Product> => {
  const response = await apiClient.put<ApiResponse<Product>>(`/api/knowledge/products/${id}`, data);
  return response.data.data!;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/knowledge/products/${id}`);
};

// FAQs
export const getFAQs = async (): Promise<FAQ[]> => {
  const response = await apiClient.get<ApiResponse<FAQ[]>>('/api/knowledge/faqs');
  return response.data.data || [];
};

export const createFAQ = async (data: FAQRequest): Promise<FAQ> => {
  const response = await apiClient.post<ApiResponse<FAQ>>('/api/knowledge/faqs', data);
  return response.data.data!;
};

export const updateFAQ = async (id: string, data: FAQRequest): Promise<FAQ> => {
  const response = await apiClient.put<ApiResponse<FAQ>>(`/api/knowledge/faqs/${id}`, data);
  return response.data.data!;
};

export const deleteFAQ = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/knowledge/faqs/${id}`);
};

// Brand Guidelines
export const getBrandGuidelines = async (): Promise<BrandGuidelines | null> => {
  const response = await apiClient.get<ApiResponse<BrandGuidelines>>('/api/knowledge/brand-guidelines');
  return response.data.data || null;
};

export const updateBrandGuidelines = async (data: BrandGuidelinesRequest): Promise<BrandGuidelines> => {
  const response = await apiClient.put<ApiResponse<BrandGuidelines>>('/api/knowledge/brand-guidelines', data);
  return response.data.data!;
};

export default apiClient;