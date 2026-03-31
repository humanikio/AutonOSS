import { Request, Response } from 'express';
import { firestore } from '../config/firebase';
import { TenantKnowledgeService } from '../services/tenantKnowledgeService';
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

export class KnowledgeController {
  // ===== BUSINESS INFO ENDPOINTS =====
  
  static async getBusinessInfo(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const businessInfoSnapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('businessInfo')
        .limit(1)
        .get();

      const businessInfo = businessInfoSnapshot.empty 
        ? null 
        : businessInfoSnapshot.docs[0].data() as BusinessInfo;

      res.status(200).json({
        success: true,
        data: businessInfo,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get business info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business info',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async updateBusinessInfo(req: Request<{}, ApiResponse<BusinessInfo>, BusinessInfoRequest>, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const businessInfoData: BusinessInfo = {
        id: 'main',
        tenantId,
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('businessInfo')
        .doc('main')
        .set(businessInfoData, { merge: true });

      // Create/update tenant knowledge base
      try {
        await TenantKnowledgeService.ensureBusinessInfoKnowledgeBase(tenantId);
        console.log('✅ Business info knowledge base updated for tenant:', tenantId);
      } catch (error) {
        console.error('Failed to update business info knowledge base:', error);
        // Don't fail the request - the data was saved successfully
      }

      res.status(200).json({
        success: true,
        data: businessInfoData,
        message: 'Business info updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Update business info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update business info',
        timestamp: new Date().toISOString()
      });
    }
  }

  // ===== PRODUCTS ENDPOINTS =====

  static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const productsSnapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('products')
        .orderBy('createdAt', 'desc')
        .get();

      const products: Product[] = productsSnapshot.docs.map(doc => ({
        ...doc.data()
      })) as Product[];

      res.status(200).json({
        success: true,
        data: products,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get products error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get products',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async createProduct(req: Request<{}, ApiResponse<Product>, ProductRequest>, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const productId = firestore.collection('temp').doc().id;
      const productData: Product = {
        id: productId,
        tenantId,
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('products')
        .doc(productId)
        .set(productData);

      // Create/update tenant knowledge base
      try {
        await TenantKnowledgeService.ensureProductKnowledgeBase(tenantId, productId);
        console.log('✅ Product knowledge base updated for:', productId);
      } catch (error) {
        console.error('Failed to update product knowledge base:', error);
        // Don't fail the request - the data was saved successfully
      }

      res.status(201).json({
        success: true,
        data: productData,
        message: 'Product created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Create product error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create product',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async updateProduct(req: Request<{id: string}, ApiResponse<Product>, ProductRequest>, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const productRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('products')
        .doc(id);

      const productDoc = await productRef.get();
      
      if (!productDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatedProduct: Product = {
        ...productDoc.data() as Product,
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      await productRef.set(updatedProduct);

      // Create/update tenant knowledge base
      try {
        await TenantKnowledgeService.ensureProductKnowledgeBase(tenantId, id);
        console.log('✅ Product knowledge base updated for:', id);
      } catch (error) {
        console.error('Failed to update product knowledge base:', error);
        // Don't fail the request - the data was saved successfully
      }

      res.status(200).json({
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update product',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('products')
        .doc(id)
        .delete();

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Delete product error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete product',
        timestamp: new Date().toISOString()
      });
    }
  }

  // ===== FAQ ENDPOINTS =====

  static async getFAQs(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const faqsSnapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('faqs')
        .orderBy('priority', 'desc')
        .orderBy('createdAt', 'desc')
        .get();

      const faqs: FAQ[] = faqsSnapshot.docs.map(doc => ({
        ...doc.data()
      })) as FAQ[];

      res.status(200).json({
        success: true,
        data: faqs,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get FAQs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get FAQs',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async createFAQ(req: Request<{}, ApiResponse<FAQ>, FAQRequest>, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const faqId = firestore.collection('temp').doc().id;
      const faqData: FAQ = {
        id: faqId,
        tenantId,
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('faqs')
        .doc(faqId)
        .set(faqData);

      // Create/update tenant knowledge base for this FAQ category
      try {
        await TenantKnowledgeService.ensureFAQCategoryKnowledgeBase(tenantId, faqData.category);
        console.log('✅ FAQ knowledge base updated for category:', faqData.category);
      } catch (error) {
        console.error('Failed to update FAQ knowledge base:', error);
        // Don't fail the request - the data was saved successfully
      }

      res.status(201).json({
        success: true,
        data: faqData,
        message: 'FAQ created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Create FAQ error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create FAQ',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async updateFAQ(req: Request<{id: string}, ApiResponse<FAQ>, FAQRequest>, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const faqRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('faqs')
        .doc(id);

      const faqDoc = await faqRef.get();
      
      if (!faqDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'FAQ not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatedFAQ: FAQ = {
        ...faqDoc.data() as FAQ,
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      await faqRef.set(updatedFAQ);

      // Create/update tenant knowledge base for this FAQ category
      try {
        await TenantKnowledgeService.ensureFAQCategoryKnowledgeBase(tenantId, updatedFAQ.category);
        console.log('✅ FAQ knowledge base updated for category:', updatedFAQ.category);
      } catch (error) {
        console.error('Failed to update FAQ knowledge base:', error);
        // Don't fail the request - the data was saved successfully
      }

      res.status(200).json({
        success: true,
        data: updatedFAQ,
        message: 'FAQ updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Update FAQ error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update FAQ',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async deleteFAQ(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('faqs')
        .doc(id)
        .delete();

      res.status(200).json({
        success: true,
        message: 'FAQ deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Delete FAQ error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete FAQ',
        timestamp: new Date().toISOString()
      });
    }
  }

  // ===== BRAND GUIDELINES ENDPOINTS =====

  static async getBrandGuidelines(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const brandGuidelinesSnapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('brandGuidelines')
        .limit(1)
        .get();

      const brandGuidelines = brandGuidelinesSnapshot.empty 
        ? null 
        : brandGuidelinesSnapshot.docs[0].data() as BrandGuidelines;

      res.status(200).json({
        success: true,
        data: brandGuidelines,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get brand guidelines error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get brand guidelines',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async updateBrandGuidelines(req: Request<{}, ApiResponse<BrandGuidelines>, BrandGuidelinesRequest>, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const brandGuidelinesData: BrandGuidelines = {
        id: 'main',
        tenantId,
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('brandGuidelines')
        .doc('main')
        .set(brandGuidelinesData, { merge: true });

      // Create/update tenant knowledge base
      try {
        await TenantKnowledgeService.ensureBrandGuidelinesKnowledgeBase(tenantId);
        console.log('✅ Brand guidelines knowledge base updated for tenant:', tenantId);
      } catch (error) {
        console.error('Failed to update brand guidelines knowledge base:', error);
        // Don't fail the request - the data was saved successfully
      }

      res.status(200).json({
        success: true,
        data: brandGuidelinesData,
        message: 'Brand guidelines updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Update brand guidelines error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update brand guidelines',
        timestamp: new Date().toISOString()
      });
    }
  }
}