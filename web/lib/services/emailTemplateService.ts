export interface EmailTemplate {
  id: string;
  name: string;
  htmlContent: string;
  aiPrompt?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

class EmailTemplateService {
  /**
   * Get all email templates for the current tenant
   * Uses the same pattern as /app/creativehub/email-templates/page.tsx
   */
  async getTemplates(tenantId: string, token: string): Promise<EmailTemplate[]> {
    try {
      console.log('📧 Fetching templates from: /api/email-templates?tenantId=' + tenantId);
      const response = await fetch(`/api/email-templates?tenantId=${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📧 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📧 Error response:', errorText);
        throw new Error('Failed to fetch email templates');
      }

      const data = await response.json();
      console.log('📧 Raw data received:', data);

      // Backend returns array directly
      return data;
    } catch (error) {
      console.error('❌ Error fetching email templates:', error);
      throw error;
    }
  }

  /**
   * Get a single email template by ID
   */
  async getTemplate(tenantId: string, templateId: string, token: string): Promise<EmailTemplate> {
    try {
      const response = await fetch(`/api/email-templates/${templateId}?tenantId=${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch email template');
      }

      const data = await response.json();

      // Backend returns template directly
      return data;
    } catch (error) {
      console.error('Error fetching email template:', error);
      throw error;
    }
  }

  /**
   * Get only published templates (for use in email composition)
   */
  async getPublishedTemplates(tenantId: string, token: string): Promise<EmailTemplate[]> {
    try {
      const allTemplates = await this.getTemplates(tenantId, token);
      return allTemplates.filter(template => template.status === 'published');
    } catch (error) {
      console.error('Error fetching published email templates:', error);
      throw error;
    }
  }
}

export const emailTemplateService = new EmailTemplateService();
