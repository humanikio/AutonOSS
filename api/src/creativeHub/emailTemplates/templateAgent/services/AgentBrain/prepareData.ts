import { readCycle } from '../cycleManager';
import { fetchCurrentTemplateImages, TemplateImage } from '../../tools/fetchCurrentTemplateImages';
import { fetchCurrentTemplate, EmailTemplate } from '../../tools/fetchCurrentTemplate';

export interface PreparedData {
  cycleId: string;
  userPrompt: string;
  tenantId: string;
  templateId: string;
  createdAt: Date;
  status: string;
  existingImages: TemplateImage[];
  currentTemplate: EmailTemplate;
}

/**
 * Prepare data for the agent brain by reading the cycle and extracting relevant information
 *
 * @param tenantId - The tenant ID
 * @param templateId - The template ID
 * @param cycleId - The cycle ID to read
 * @returns PreparedData object containing the user's prompt and cycle metadata
 */
export async function prepareData(
  tenantId: string,
  templateId: string,
  cycleId: string
): Promise<PreparedData> {
  try {
    // Read the cycle from Firestore
    const cycle = await readCycle(tenantId, templateId, cycleId);

    // Check if cycle exists
    if (!cycle) {
      throw new Error(`Agent cycle not found: ${cycleId}`);
    }

    // Fetch existing template images (with base64 for LLM context)
    const imagesResult = await fetchCurrentTemplateImages(tenantId, templateId);

    // Fetch current template for context
    const templateResult = await fetchCurrentTemplate(tenantId, templateId);

    // Extract and return the prepared data
    return {
      cycleId: cycle.id,
      userPrompt: cycle.prompt || '',
      tenantId: cycle.tenantId,
      templateId: cycle.templateId,
      createdAt: cycle.createdAt,
      status: cycle.status,
      existingImages: imagesResult.images,
      currentTemplate: templateResult.template
    };
  } catch (error) {
    console.error('Error preparing data for agent brain:', error);
    throw new Error('Failed to prepare data for agent brain');
  }
}
