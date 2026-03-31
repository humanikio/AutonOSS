/**
 * Prepare Data for HTML Generation
 *
 * Fetches all necessary data for HTML generation:
 * - Existing template images (with base64 for context)
 * - Chat history for conversation context
 * - Task parameters with HTML specifications
 */

import { fetchCurrentTemplateImages, TemplateImage } from '../../tools/fetchCurrentTemplateImages';
import { fetchChatHistory } from '../../tools/fetchChatHistory';
import { fetchCurrentTemplate, EmailTemplate } from '../../tools/fetchCurrentTemplate';
import { Message } from '../chats';

export interface PrepareDataInput {
  tenantId: string;
  templateId: string;
  cycleId: string;
  taskId: string;
  htmlParameters: Record<string, any>;
}

export interface PreparedData {
  tenantId: string;
  templateId: string;
  cycleId: string;
  taskId: string;
  htmlParameters: Record<string, any>;
  existingImages: TemplateImage[];
  chatHistory: Message[];
  currentTemplate: EmailTemplate;
}

/**
 * Prepare all data needed for HTML generation
 *
 * @param input - Parameters for data preparation
 * @returns Prepared data including images and chat history
 */
export async function prepareData(input: PrepareDataInput): Promise<PreparedData> {
  const { tenantId, templateId, cycleId, taskId, htmlParameters } = input;

  console.log('[HTML Prepare Data] Starting data preparation...');
  console.log('[HTML Prepare Data] Template ID:', templateId);
  console.log('[HTML Prepare Data] Cycle ID:', cycleId);
  console.log('[HTML Prepare Data] Task ID:', taskId);

  try {
    // Step 1: Fetch existing template images
    console.log('[HTML Prepare Data] Step 1: Fetching existing template images...');
    const imagesResult = await fetchCurrentTemplateImages(tenantId, templateId);
    console.log(`[HTML Prepare Data] Found ${imagesResult.totalImages} image(s)`);

    // Step 2: Fetch chat history for context
    console.log('[HTML Prepare Data] Step 2: Fetching chat history...');
    const chatHistory = await fetchChatHistory({
      tenantId,
      templateId,
      cycleId
    });
    console.log(`[HTML Prepare Data] Found ${chatHistory.length} message(s)`);

    // Step 3: Fetch current template
    console.log('[HTML Prepare Data] Step 3: Fetching current template...');
    const templateResult = await fetchCurrentTemplate(tenantId, templateId);
    console.log(`[HTML Prepare Data] Template: ${templateResult.template.name}`);

    console.log('[HTML Prepare Data] Data preparation complete');

    return {
      tenantId,
      templateId,
      cycleId,
      taskId,
      htmlParameters,
      existingImages: imagesResult.images,
      chatHistory,
      currentTemplate: templateResult.template
    };
  } catch (error) {
    console.error('[HTML Prepare Data] Error preparing data:', error);
    throw new Error(
      `Failed to prepare data for HTML generation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
