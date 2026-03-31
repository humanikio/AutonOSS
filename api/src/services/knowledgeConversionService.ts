import { BusinessInfo, Product, FAQ, BrandGuidelines } from '@/types';

export interface KnowledgeBaseRequest {
  type: 'text' | 'url' | 'file';
  name: string;
  content?: string;
  url?: string;
  usage_mode?: 'auto' | 'prompt';
  file_name?: string;
}

export class KnowledgeConversionService {
  // Convert business info to knowledge base format
  static convertBusinessInfoToKnowledgeBase(businessInfo: BusinessInfo, tenantId: string): KnowledgeBaseRequest {
    const content = this.formatBusinessInfoContent(businessInfo);
    
    return {
      type: 'text',
      name: `${businessInfo.companyName} - Business Information`,
      content: content,
      usage_mode: 'auto'
    };
  }

  // Convert product to knowledge base format
  static convertProductToKnowledgeBase(product: Product, tenantId: string): KnowledgeBaseRequest {
    const content = this.formatProductContent(product);
    
    return {
      type: 'text',
      name: `${product.name} - Product Information`,
      content: content,
      usage_mode: 'auto'
    };
  }

  // Convert FAQ category to knowledge base format
  static convertFAQCategoryToKnowledgeBase(faqs: FAQ[], category: string, tenantId: string): KnowledgeBaseRequest {
    const content = this.formatFAQContent(faqs, category);
    
    return {
      type: 'text',
      name: `${category} - FAQs`,
      content: content,
      usage_mode: 'auto'
    };
  }

  // Convert brand guidelines to knowledge base format
  static convertBrandGuidelinesToKnowledgeBase(guidelines: BrandGuidelines, tenantId: string): KnowledgeBaseRequest {
    const content = this.formatBrandGuidelinesContent(guidelines);
    
    return {
      type: 'text',
      name: `Brand Guidelines - ${guidelines.voice} Voice`,
      content: content,
      usage_mode: 'prompt' // Always include brand guidelines in prompts
    };
  }

  // ===== CONTENT FORMATTING METHODS =====

  private static formatBusinessInfoContent(businessInfo: BusinessInfo): string {
    let content = `Company: ${businessInfo.companyName}\n`;
    content += `Industry: ${businessInfo.industry}\n`;
    content += `Description: ${businessInfo.description}\n`;
    
    if (businessInfo.mission) {
      content += `Mission: ${businessInfo.mission}\n`;
    }
    
    if (businessInfo.foundedYear) {
      content += `Founded: ${businessInfo.foundedYear}\n`;
    }
    
    if (businessInfo.website) {
      content += `Website: ${businessInfo.website}\n`;
    }
    
    if (businessInfo.phone) {
      content += `Phone: ${businessInfo.phone}\n`;
    }
    
    if (businessInfo.email) {
      content += `Email: ${businessInfo.email}\n`;
    }
    
    if (businessInfo.address) {
      content += `Address: ${businessInfo.address.street}, ${businessInfo.address.city}, ${businessInfo.address.state} ${businessInfo.address.zipCode}, ${businessInfo.address.country}\n`;
    }
    
    return content;
  }

  private static formatProductContent(product: Product): string {
    let content = `Product: ${product.name}\n`;
    content += `Description: ${product.description}\n`;
    content += `Category: ${product.category}\n`;
    
    if (product.price) {
      content += `Price: $${product.price}\n`;
    }
    
    if (product.pricingModel) {
      content += `Pricing Model: ${product.pricingModel}\n`;
    }
    
    if (product.pricingDetails) {
      content += `Pricing Details: ${product.pricingDetails}\n`;
    }
    
    if (product.features && product.features.length > 0) {
      content += `Features:\n`;
      product.features.forEach((feature: string) => {
        content += `- ${feature}\n`;
      });
    }
    
    return content;
  }

  private static formatFAQContent(faqs: FAQ[], category: string): string {
    let content = `Frequently Asked Questions - ${category}\n\n`;
    
    faqs
      .filter(faq => faq.category === category)
      .sort((a, b) => b.priority - a.priority) // Higher priority first
      .forEach(faq => {
        content += `Q: ${faq.question}\n`;
        content += `A: ${faq.answer}\n\n`;
      });
    
    return content;
  }

  private static formatBrandGuidelinesContent(guidelines: BrandGuidelines): string {
    let content = `Brand Guidelines\n\n`;
    content += `Voice: ${guidelines.voice}\n`;
    content += `Tone: ${guidelines.tone}\n\n`;
    
    if (guidelines.keyValues && guidelines.keyValues.length > 0) {
      content += `Key Values:\n`;
      guidelines.keyValues.forEach((value: string) => {
        content += `- ${value}\n`;
      });
      content += `\n`;
    }
    
    if (guidelines.communicationGuidelines) {
      content += `Communication Guidelines:\n${guidelines.communicationGuidelines}\n\n`;
    }
    
    if (guidelines.doNots && guidelines.doNots.length > 0) {
      content += `Important Restrictions (Do NOT):\n`;
      guidelines.doNots.forEach((doNot: string) => {
        content += `- ${doNot}\n`;
      });
    }
    
    return content;
  }

  // Generate content hash for change detection
  static generateContentHash(content: any): string {
    const crypto = require('crypto');
    const contentString = JSON.stringify(content, Object.keys(content).sort());
    return crypto.createHash('md5').update(contentString).digest('hex');
  }
}

export const knowledgeConversionService = KnowledgeConversionService;