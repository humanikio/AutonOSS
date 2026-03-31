import { useState, useEffect } from 'react';
import { 
  BusinessInfo,
  BusinessInfoRequest,
  Product,
  ProductRequest,
  FAQ,
  FAQRequest,
  BrandGuidelines,
  BrandGuidelinesRequest 
} from '@/types';
import {
  getBusinessInfo,
  updateBusinessInfo,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getBrandGuidelines,
  updateBrandGuidelines
} from '../lib/api/client';

export const useKnowledgeHub = () => {
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data states
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuidelines | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [businessData, productsData, faqsData, brandData] = await Promise.all([
          getBusinessInfo(),
          getProducts(),
          getFAQs(),
          getBrandGuidelines()
        ]);

        setBusinessInfo(businessData);
        setProducts(productsData);
        setFAQs(faqsData);
        setBrandGuidelines(brandData);
      } catch (err: any) {
        setError(err.message || 'Failed to load knowledge hub data');
        console.error('Error loading knowledge hub data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Business Info functions
  const saveBusinessInfo = async (data: BusinessInfoRequest) => {
    try {
      setSaving(true);
      const updatedBusinessInfo = await updateBusinessInfo(data);
      setBusinessInfo(updatedBusinessInfo);
      return updatedBusinessInfo;
    } catch (err: any) {
      setError(err.message || 'Failed to save business info');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Product functions
  const addProduct = async (data: ProductRequest) => {
    try {
      setSaving(true);
      const newProduct = await createProduct(data);
      setProducts(prev => [newProduct, ...prev]);
      return newProduct;
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const editProduct = async (id: string, data: ProductRequest) => {
    try {
      setSaving(true);
      const updatedProduct = await updateProduct(id, data);
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
      return updatedProduct;
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id: string) => {
    try {
      setSaving(true);
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // FAQ functions
  const addFAQ = async (data: FAQRequest) => {
    try {
      setSaving(true);
      const newFAQ = await createFAQ(data);
      setFAQs(prev => [newFAQ, ...prev]);
      return newFAQ;
    } catch (err: any) {
      setError(err.message || 'Failed to create FAQ');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const editFAQ = async (id: string, data: FAQRequest) => {
    try {
      setSaving(true);
      const updatedFAQ = await updateFAQ(id, data);
      setFAQs(prev => prev.map(f => f.id === id ? updatedFAQ : f));
      return updatedFAQ;
    } catch (err: any) {
      setError(err.message || 'Failed to update FAQ');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const removeFAQ = async (id: string) => {
    try {
      setSaving(true);
      await deleteFAQ(id);
      setFAQs(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete FAQ');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Brand Guidelines functions
  const saveBrandGuidelines = async (data: BrandGuidelinesRequest) => {
    try {
      setSaving(true);
      const updatedBrandGuidelines = await updateBrandGuidelines(data);
      setBrandGuidelines(updatedBrandGuidelines);
      return updatedBrandGuidelines;
    } catch (err: any) {
      setError(err.message || 'Failed to save brand guidelines');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Clear error function
  const clearError = () => setError(null);

  return {
    // Data
    businessInfo,
    products,
    faqs,
    brandGuidelines,
    
    // States
    loading,
    saving,
    error,
    
    // Functions
    saveBusinessInfo,
    addProduct,
    editProduct,
    removeProduct,
    addFAQ,
    editFAQ,
    removeFAQ,
    saveBrandGuidelines,
    clearError
  };
};