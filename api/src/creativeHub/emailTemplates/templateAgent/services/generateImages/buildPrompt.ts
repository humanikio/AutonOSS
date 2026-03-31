import { BASE_PROMPT_FOR_EMAIL_IMAGES } from './promptEngineering/basePrompt';
import { emailImageExamples } from './promptEngineering/examples';
import { formatChatHistoryForImages } from './promptEngineering/chatHistory';
import { readCycle } from '../cycleManager';
import { fetchCurrentTemplate } from '../../tools/fetchCurrentTemplate';

export interface BuildImagePromptInput {
  tenantId: string;
  templateId: string;
  cycleId: string;
  taskId: string;
  imageParameters: Record<string, any>; // From task.parameters
}

export interface BuildImagePromptOutput {
  fullPrompt: string;
  metadata: {
    style?: string;
    dimensions?: string;
    purpose?: string;
    originalRequest?: string;
  };
}

/**
 * Build the complete image generation prompt by combining:
 * 1. Base email image guidelines
 * 2. Example prompts for reference
 * 3. Overall template context from cycle
 * 4. Chat history for design context
 * 5. Specific image request from task parameters
 *
 * @param input - Object containing context identifiers and image parameters
 * @returns Object containing the full compiled prompt and metadata
 */
export async function buildImagePrompt(
  input: BuildImagePromptInput
): Promise<BuildImagePromptOutput> {
  const { tenantId, templateId, cycleId, taskId, imageParameters } = input;

  console.log('[Build Image Prompt] Compiling prompt for task:', taskId);

  try {
    // 1. Load cycle to get original user request
    console.log('[Build Image Prompt] Loading cycle context...');
    const cycle = await readCycle(tenantId, templateId, cycleId);

    if (!cycle) {
      throw new Error(`Cycle ${cycleId} not found`);
    }

    const originalRequest = cycle.prompt || 'Create professional email template';

    // 2. Load current template for context
    console.log('[Build Image Prompt] Loading template context...');
    const templateResult = await fetchCurrentTemplate(tenantId, templateId);
    const currentTemplate = templateResult.template;

    // 3. Load chat history for design context
    console.log('[Build Image Prompt] Loading chat history...');
    const chatHistorySection = await formatChatHistoryForImages({
      tenantId,
      templateId,
      cycleId
    });

    // 4. Extract specific image request from task parameters
    const imageRequest = imageParameters.prompt || 'Professional email header image';
    const style = imageParameters.style;
    const purpose = imageParameters.purpose;
    const dimensions = imageParameters.dimensions;

    console.log('[Build Image Prompt] Image request:', imageRequest.substring(0, 100) + '...');
    console.log('[Build Image Prompt] Style:', style || 'not specified');
    console.log('[Build Image Prompt] Purpose:', purpose || 'not specified');

    // 5. Build template context section
    const templateContextSection = `
==================
TEMPLATE CONTEXT:
==================

Template Name: ${currentTemplate.name}
Development Stage: ${currentTemplate.htmlContent ? 'Has existing HTML content' : 'Planning/initial stage'}
Template Goal: ${currentTemplate.aiPrompt || originalRequest}

This context helps ensure visual consistency with the overall template design.
`;

    // 6. Compile examples section
    const examplesSection = `
==================
EXAMPLE PROMPTS (for reference):
==================

Here are examples of well-crafted email image prompts:

LEGAL SERVICES HEADER:
${emailImageExamples.legal_services_header.good}

MARKETING AGENCY HEADER:
${emailImageExamples.marketing_agency_header.good}

CTA BACKGROUND:
${emailImageExamples.cta_button_background.good}

HOLIDAY PROMOTIONAL:
${emailImageExamples.holiday_promotional_header.good}

These examples demonstrate the level of detail and specificity needed.
`;

    // 7. Compile the full prompt
    const fullPrompt = `
${BASE_PROMPT_FOR_EMAIL_IMAGES}

${examplesSection}

${templateContextSection}

${chatHistorySection}

==================
SPECIFIC IMAGE REQUEST:
==================

Generate the following image for the email template:

${imageRequest}

${style ? `Preferred style: ${style}` : ''}
${purpose ? `Image purpose: ${purpose}` : ''}
${dimensions ? `Dimensions: ${dimensions}` : 'Dimensions: 600x300px (standard email header)'}

CRITICAL REQUIREMENTS:
- Follow all email image guidelines above
- Maintain consistency with the email template context
- Ensure professional quality suitable for business email
- Optimize for email rendering (web-safe colors, appropriate file size)
- Create clear focal points that work at small sizes
- Consider text overlay needs if this is a header or CTA background

Generate the image now:`;

    console.log('[Build Image Prompt]  Prompt compiled successfully');
    console.log('[Build Image Prompt] Total prompt length:', fullPrompt.length, 'characters');

    return {
      fullPrompt,
      metadata: {
        style,
        dimensions,
        purpose,
        originalRequest
      }
    };
  } catch (error) {
    console.error('[Build Image Prompt] Error building prompt:', error);
    throw new Error(
      `Failed to build image prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
