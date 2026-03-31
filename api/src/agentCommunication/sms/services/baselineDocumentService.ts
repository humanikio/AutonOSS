import { firestore } from '../../../config/firebase';

export interface BaselineDocument {
  companyName: string;
  industry: string;
  mission: string;
  values: string[];
  targetAudience: string;
  businessHours: string;
  supportChannels: string[];
  keyDifferentiators: string;
  formattedContext?: string;
}

export class BaselineDocumentService {
  /**
   * Load and format baseline document for prompt inclusion
   * This is now REQUIRED for every SMS interaction
   */
  async getFormattedBaseline(tenantId: string): Promise<string> {
    try {
      console.log(`📋 Loading company baseline document for tenant: ${tenantId}`);
      
      const baselineRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('configuration').doc('baseline');
      
      const baselineDoc = await baselineRef.get();
      
      if (!baselineDoc.exists) {
        console.log('⚠️ No baseline document found, using default');
        return this.getDefaultBaseline();
      }
      
      const data = baselineDoc.data() as BaselineDocument;
      const formattedContext = this.formatForPrompt(data);
      
      console.log(`✅ Baseline document loaded (${formattedContext.length} characters)`);
      return formattedContext;
      
    } catch (error) {
      console.error('❌ Error loading baseline document:', error);
      return this.getDefaultBaseline();
    }
  }
  
  /**
   * Format baseline data for optimal prompt inclusion
   */
  private formatForPrompt(baseline: BaselineDocument): string {
    let formattedContext = `COMPANY FOUNDATION KNOWLEDGE (Always Available):

Company: ${baseline.companyName}
Industry: ${baseline.industry}

Mission Statement: ${baseline.mission}`;

    if (baseline.values && baseline.values.length > 0) {
      formattedContext += `\n\nCore Values: ${baseline.values.join(', ')}`;
    }

    if (baseline.targetAudience) {
      formattedContext += `\n\nTarget Audience: ${baseline.targetAudience}`;
    }

    if (baseline.businessHours) {
      formattedContext += `\n\nBusiness Hours: ${baseline.businessHours}`;
    }

    if (baseline.supportChannels && baseline.supportChannels.length > 0) {
      formattedContext += `\n\nSupport Channels: ${baseline.supportChannels.join(', ')}`;
    }

    if (baseline.keyDifferentiators) {
      formattedContext += `\n\nKey Differentiators: ${baseline.keyDifferentiators}`;
    }

    formattedContext += `\n\n🎯 GUIDANCE: This foundational company information should guide all customer interactions and responses. Use this context to maintain consistent brand voice and accurate company representation.`;

    return formattedContext;
  }
  
  /**
   * Fallback baseline when no document is configured
   */
  private getDefaultBaseline(): string {
    return `COMPANY FOUNDATION KNOWLEDGE (Default):

Company: Professional Customer Service Organization
Industry: Customer Support Services
Mission: Delivering exceptional customer experiences through intelligent, responsive support that puts customers first.

Core Values: Excellence, Innovation, Customer Focus, Integrity, Continuous Improvement

Target Audience: Customers seeking reliable support and solutions for their needs

Business Hours: Available during standard business hours with extended support options

Support Channels: Multiple communication channels including SMS, email, phone, and chat

Key Differentiators: 
- Personalized service approach
- Quick response times
- Knowledgeable support team
- Customer-centric solutions
- Commitment to problem resolution

🎯 GUIDANCE: This foundational company information should guide all customer interactions. Maintain a professional yet warm approach, focus on solution-oriented responses, and ensure every interaction reflects our commitment to customer excellence.`;
  }

  /**
   * Save baseline document (for future UI integration)
   */
  async saveBaseline(tenantId: string, baseline: BaselineDocument): Promise<boolean> {
    try {
      const baselineRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('configuration').doc('baseline');
      
      await baselineRef.set({
        ...baseline,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      });
      
      console.log(`✅ Baseline document saved for tenant: ${tenantId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error saving baseline document:', error);
      return false;
    }
  }

  /**
   * Load raw baseline document (for UI editing)
   */
  async getBaseline(tenantId: string): Promise<BaselineDocument | null> {
    try {
      const baselineRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('configuration').doc('baseline');
      
      const baselineDoc = await baselineRef.get();
      
      if (!baselineDoc.exists) {
        return null;
      }
      
      return baselineDoc.data() as BaselineDocument;
      
    } catch (error) {
      console.error('Error loading raw baseline document:', error);
      return null;
    }
  }
}

export const baselineDocumentService = new BaselineDocumentService();