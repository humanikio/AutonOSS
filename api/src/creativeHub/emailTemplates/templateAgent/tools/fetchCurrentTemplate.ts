import { readEmailTemplate, EmailTemplate } from '../../services/emailTemplateManager';

export interface FetchTemplateOutput {
  template: EmailTemplate;
}

/**
 * Fetch the current template document for context in agent operations
 *
 * @param tenantId - The tenant ID
 * @param templateId - The template ID
 * @returns The current template document
 */
export async function fetchCurrentTemplate(
  tenantId: string,
  templateId: string
): Promise<FetchTemplateOutput> {
  try {
    const template = await readEmailTemplate(tenantId, templateId);

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    console.log(`[Fetch Template] Loaded template: ${template.name}`);
    console.log(`[Fetch Template] Has HTML: ${template.htmlContent ? `Yes (${template.htmlContent.length} chars)` : 'No'}`);

    return { template };
  } catch (error) {
    console.error('[Fetch Template] Error fetching template:', error);
    throw error;
  }
}

// Re-export EmailTemplate type for convenience
export type { EmailTemplate };
