import { firestore } from '../config/firebase';
import { elevenlabsKnowledgeService } from './elevenlabsKnowledgeService';
import { knowledgeConversionService } from './knowledgeConversionService';
import { BusinessInfo, Product, FAQ, BrandGuidelines } from '@/types';

export interface TenantKnowledgeMapping {
  elevenlabsId: string;
  version: string;  // Content hash for change detection
  lastUpdated: string;
  name?: string;
}

export interface TenantKnowledgeMappings {
  businessInfo?: TenantKnowledgeMapping;
  brandGuidelines?: TenantKnowledgeMapping;
  products: Record<string, TenantKnowledgeMapping>;
  faqs: Record<string, TenantKnowledgeMapping>;
}

export class TenantKnowledgeService {
  
  /**
   * Get tenant knowledge base mappings
   */
  static async getTenantMappings(tenantId: string): Promise<TenantKnowledgeMappings> {
    const mappingDoc = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('knowledgeBaseMappings')
      .doc('mappings')
      .get();

    if (!mappingDoc.exists) {
      // Return default empty structure
      return {
        products: {},
        faqs: {}
      };
    }

    return mappingDoc.data() as TenantKnowledgeMappings;
  }

  /**
   * Update tenant knowledge base mappings
   */
  static async updateTenantMappings(tenantId: string, mappings: TenantKnowledgeMappings): Promise<void> {
    await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('knowledgeBaseMappings')
      .doc('mappings')
      .set(mappings, { merge: true });
  }

  /**
   * Create or update business info knowledge base
   */
  static async ensureBusinessInfoKnowledgeBase(tenantId: string): Promise<string | null> {
    const mappings = await this.getTenantMappings(tenantId);
    
    // Get current business info
    const businessInfoSnapshot = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('businessInfo')
      .limit(1)
      .get();

    if (businessInfoSnapshot.empty) {
      return null;
    }

    const businessInfo = businessInfoSnapshot.docs[0].data() as BusinessInfo;
    const currentVersion = knowledgeConversionService.generateContentHash(businessInfo);

    // Check if we need to create or update
    const existing = mappings.businessInfo;
    if (existing && existing.version === currentVersion) {
      // No change needed
      return existing.elevenlabsId;
    }

    console.log('Creating/updating business info knowledge base...');
    
    // Delete old knowledge base if it exists
    if (existing?.elevenlabsId) {
      try {
        await elevenlabsKnowledgeService.deleteKnowledgeBase(existing.elevenlabsId);
      } catch (error) {
        console.warn('Failed to delete old business info KB:', error);
      }
    }

    // Create new knowledge base
    const kbRequest = knowledgeConversionService.convertBusinessInfoToKnowledgeBase(businessInfo, tenantId);
    const createdKB = await elevenlabsKnowledgeService.createKnowledgeBaseFromText(
      kbRequest.content!,
      kbRequest.name
    );

    // Update mappings
    mappings.businessInfo = {
      elevenlabsId: createdKB.id,
      version: currentVersion,
      lastUpdated: new Date().toISOString(),
      name: createdKB.name
    };

    await this.updateTenantMappings(tenantId, mappings);
    console.log('✅ Business info KB created/updated:', createdKB.id);
    
    return createdKB.id;
  }

  /**
   * Create or update brand guidelines knowledge base
   */
  static async ensureBrandGuidelinesKnowledgeBase(tenantId: string): Promise<string | null> {
    const mappings = await this.getTenantMappings(tenantId);
    
    // Get current brand guidelines
    const brandGuidelinesSnapshot = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('brandGuidelines')
      .limit(1)
      .get();

    if (brandGuidelinesSnapshot.empty) {
      return null;
    }

    const brandGuidelines = brandGuidelinesSnapshot.docs[0].data() as BrandGuidelines;
    const currentVersion = knowledgeConversionService.generateContentHash(brandGuidelines);

    // Check if we need to create or update
    const existing = mappings.brandGuidelines;
    if (existing && existing.version === currentVersion) {
      // No change needed
      return existing.elevenlabsId;
    }

    console.log('Creating/updating brand guidelines knowledge base...');
    
    // Delete old knowledge base if it exists
    if (existing?.elevenlabsId) {
      try {
        await elevenlabsKnowledgeService.deleteKnowledgeBase(existing.elevenlabsId);
      } catch (error) {
        console.warn('Failed to delete old brand guidelines KB:', error);
      }
    }

    // Create new knowledge base
    const kbRequest = knowledgeConversionService.convertBrandGuidelinesToKnowledgeBase(brandGuidelines, tenantId);
    const createdKB = await elevenlabsKnowledgeService.createKnowledgeBaseFromText(
      kbRequest.content!,
      kbRequest.name
    );

    // Update mappings
    mappings.brandGuidelines = {
      elevenlabsId: createdKB.id,
      version: currentVersion,
      lastUpdated: new Date().toISOString(),
      name: createdKB.name
    };

    await this.updateTenantMappings(tenantId, mappings);
    console.log('✅ Brand guidelines KB created/updated:', createdKB.id);
    
    return createdKB.id;
  }

  /**
   * Create or update product knowledge base
   */
  static async ensureProductKnowledgeBase(tenantId: string, productId: string): Promise<string | null> {
    const mappings = await this.getTenantMappings(tenantId);
    
    // Get current product
    const productDoc = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('products')
      .doc(productId)
      .get();

    if (!productDoc.exists) {
      return null;
    }

    const product = { id: productDoc.id, ...productDoc.data() } as Product;
    const currentVersion = knowledgeConversionService.generateContentHash(product);

    // Check if we need to create or update
    const existing = mappings.products[productId];
    if (existing && existing.version === currentVersion) {
      // No change needed
      return existing.elevenlabsId;
    }

    console.log(`Creating/updating product knowledge base for ${productId}...`);
    
    // Delete old knowledge base if it exists
    if (existing?.elevenlabsId) {
      try {
        await elevenlabsKnowledgeService.deleteKnowledgeBase(existing.elevenlabsId);
      } catch (error) {
        console.warn(`Failed to delete old product KB for ${productId}:`, error);
      }
    }

    // Create new knowledge base
    const kbRequest = knowledgeConversionService.convertProductToKnowledgeBase(product, tenantId);
    const createdKB = await elevenlabsKnowledgeService.createKnowledgeBaseFromText(
      kbRequest.content!,
      kbRequest.name
    );

    // Update mappings
    mappings.products[productId] = {
      elevenlabsId: createdKB.id,
      version: currentVersion,
      lastUpdated: new Date().toISOString(),
      name: createdKB.name
    };

    await this.updateTenantMappings(tenantId, mappings);
    console.log(`✅ Product KB created/updated for ${productId}:`, createdKB.id);
    
    return createdKB.id;
  }

  /**
   * Create or update FAQ category knowledge base
   */
  static async ensureFAQCategoryKnowledgeBase(tenantId: string, category: string): Promise<string | null> {
    const mappings = await this.getTenantMappings(tenantId);
    
    // Get all FAQs for this category
    const faqsSnapshot = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('faqs')
      .where('category', '==', category)
      .get();

    if (faqsSnapshot.empty) {
      return null;
    }

    const faqs = faqsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FAQ));
    const currentVersion = knowledgeConversionService.generateContentHash(faqs);

    // Check if we need to create or update
    const existing = mappings.faqs[category];
    if (existing && existing.version === currentVersion) {
      // No change needed
      return existing.elevenlabsId;
    }

    console.log(`Creating/updating FAQ knowledge base for ${category}...`);
    
    // Delete old knowledge base if it exists
    if (existing?.elevenlabsId) {
      try {
        await elevenlabsKnowledgeService.deleteKnowledgeBase(existing.elevenlabsId);
      } catch (error) {
        console.warn(`Failed to delete old FAQ KB for ${category}:`, error);
      }
    }

    // Create new knowledge base
    const kbRequest = knowledgeConversionService.convertFAQCategoryToKnowledgeBase(faqs, category, tenantId);
    const createdKB = await elevenlabsKnowledgeService.createKnowledgeBaseFromText(
      kbRequest.content!,
      kbRequest.name
    );

    // Update mappings
    mappings.faqs[category] = {
      elevenlabsId: createdKB.id,
      version: currentVersion,
      lastUpdated: new Date().toISOString(),
      name: createdKB.name
    };

    await this.updateTenantMappings(tenantId, mappings);
    console.log(`✅ FAQ KB created/updated for ${category}:`, createdKB.id);
    
    return createdKB.id;
  }

  /**
   * Get all available knowledge base options for a tenant
   */
  static async getAvailableKnowledgeBases(tenantId: string): Promise<{
    businessInfo: { available: boolean; name?: string };
    brandGuidelines: { available: boolean; name?: string };
    products: Array<{ id: string; name: string }>;
    faqCategories: Array<{ category: string; count: number }>;
  }> {
    const [businessInfoSnapshot, brandGuidelinesSnapshot, productsSnapshot, faqsSnapshot] = await Promise.all([
      firestore.collection('tenants').doc(tenantId).collection('businessInfo').limit(1).get(),
      firestore.collection('tenants').doc(tenantId).collection('brandGuidelines').limit(1).get(),
      firestore.collection('tenants').doc(tenantId).collection('products').get(),
      firestore.collection('tenants').doc(tenantId).collection('faqs').get()
    ]);

    // Process FAQ categories
    const faqsByCategory: Record<string, number> = {};
    faqsSnapshot.docs.forEach(doc => {
      const faq = doc.data() as FAQ;
      faqsByCategory[faq.category] = (faqsByCategory[faq.category] || 0) + 1;
    });

    return {
      businessInfo: {
        available: !businessInfoSnapshot.empty,
        name: businessInfoSnapshot.empty ? undefined : businessInfoSnapshot.docs[0].data().companyName
      },
      brandGuidelines: {
        available: !brandGuidelinesSnapshot.empty,
        name: brandGuidelinesSnapshot.empty ? undefined : 'Brand Guidelines'
      },
      products: productsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })),
      faqCategories: Object.entries(faqsByCategory).map(([category, count]) => ({
        category,
        count
      }))
    };
  }

  /**
   * Build ElevenLabs knowledge base objects from tenant selections
   */
  static async buildKnowledgeBasesForAgent(
    tenantId: string,
    selections: {
      useBusinessInfo?: boolean;
      useBrandGuidelines?: boolean;
      selectedProductIds?: string[];
      selectedFAQCategories?: string[];
      elevenlabsKnowledgeBases?: any[];
    }
  ): Promise<any[]> {
    const knowledgeBaseObjects: any[] = [];
    const mappings = await this.getTenantMappings(tenantId);

    // Business Info
    if (selections.useBusinessInfo && mappings.businessInfo) {
      knowledgeBaseObjects.push({
        type: "text",
        name: mappings.businessInfo.name || "Business Information",
        id: mappings.businessInfo.elevenlabsId,
        usage_mode: "auto"
      });
    }

    // Brand Guidelines
    if (selections.useBrandGuidelines && mappings.brandGuidelines) {
      knowledgeBaseObjects.push({
        type: "text",
        name: mappings.brandGuidelines.name || "Brand Guidelines", 
        id: mappings.brandGuidelines.elevenlabsId,
        usage_mode: "prompt"
      });
    }

    // Products
    if (selections.selectedProductIds) {
      for (const productId of selections.selectedProductIds) {
        const productMapping = mappings.products[productId];
        if (productMapping) {
          knowledgeBaseObjects.push({
            type: "text",
            name: productMapping.name || "Product Information",
            id: productMapping.elevenlabsId,
            usage_mode: "auto"
          });
        }
      }
    }

    // FAQs
    if (selections.selectedFAQCategories) {
      for (const category of selections.selectedFAQCategories) {
        const faqMapping = mappings.faqs[category];
        if (faqMapping) {
          knowledgeBaseObjects.push({
            type: "text",
            name: faqMapping.name || `${category} - FAQs`,
            id: faqMapping.elevenlabsId,
            usage_mode: "auto"
          });
        }
      }
    }

    // External ElevenLabs Knowledge Bases
    if (selections.elevenlabsKnowledgeBases) {
      for (const kb of selections.elevenlabsKnowledgeBases) {
        if (kb.id) {
          knowledgeBaseObjects.push({
            type: kb.type || "text",
            name: kb.name || "External Knowledge",
            id: kb.id,
            usage_mode: kb.usage_mode || "auto"
          });
        }
      }
    }

    return knowledgeBaseObjects;
  }
}