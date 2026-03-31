import { BASE_PROMPT } from './promptEngineering/basePrompt';
import { TOOL_CONTEXT } from './promptEngineering/toolContext';
import { formatChatHistory } from './promptEngineering/chatHistory';
import { TemplateImage } from '../../tools/fetchCurrentTemplateImages';
import { EmailTemplate } from '../../tools/fetchCurrentTemplate';

export interface BuildPromptInput {
  userPrompt: string;
  tenantId: string;
  templateId: string;
  cycleId: string;
  existingImages: TemplateImage[];
  currentTemplate: EmailTemplate;
}

export interface BuildPromptOutput {
  fullPrompt: string;
  existingImages: TemplateImage[];
}

/**
 * Build the complete prompt for the LLM by combining:
 * 1. Base system prompt (instructions and format)
 * 2. Tool context (detailed tool documentation)
 * 3. Chat history (previous conversation context)
 * 4. User's specific prompt (their request)
 *
 * @param input - Object containing the user's prompt and context identifiers
 * @returns Object containing the full compiled prompt
 */
export async function buildPrompt(input: BuildPromptInput): Promise<BuildPromptOutput> {
  const { userPrompt, tenantId, templateId, cycleId, existingImages, currentTemplate } = input;

  // Validate that we have a user prompt
  if (!userPrompt || userPrompt.trim().length === 0) {
    throw new Error('User prompt is required to build the full prompt');
  }

  // Fetch and format chat history
  const chatHistorySection = await formatChatHistory({
    tenantId,
    templateId,
    cycleId
  });

  // Build current template context section
  const templateContextSection = `
==================
CURRENT TEMPLATE STATE:
==================

Template Name: ${currentTemplate.name}
Status: ${currentTemplate.status}
Existing HTML: ${currentTemplate.htmlContent ? `Yes (${currentTemplate.htmlContent.length} characters)` : 'No HTML generated yet'}
Original Template Goal: ${currentTemplate.aiPrompt || 'Not specified'}

${currentTemplate.htmlContent ? 'IMPORTANT: This template already has HTML content. Consider whether the user wants to UPDATE existing content or CREATE something new.' : 'This is a fresh template - you will be creating the initial HTML.'}
`;

  // Build existing images context section
  let imagesContextSection = '';
  if (existingImages.length > 0) {
    imagesContextSection = `
==================
EXISTING TEMPLATE IMAGES:
==================

You have access to ${existingImages.length} image(s) already generated for this template:

${existingImages.map((img, idx) => `
Image ${idx + 1}:
  - ID: ${img.id}
  - URL: ${img.url}
  - Purpose: ${img.purpose || 'Not specified'}
  - Dimensions: ${img.dimensions || 'Not specified'}
  - Style: ${img.style || 'Not specified'}
  - Created: ${img.createdAt.toISOString()}
`).join('\n')}

IMPORTANT:
- When generating HTML, reference these image URLs directly
- Only generate NEW images if the user requests more or the existing images are insufficient
- If existing images cover the user's needs, use them instead of generating duplicates
`;
  }

  // Compile the full prompt by combining all parts
  const fullPrompt = `${BASE_PROMPT}

${TOOL_CONTEXT}

${templateContextSection}

${chatHistorySection}
${imagesContextSection}

==================
USER REQUEST:
==================

${userPrompt}

==================
YOUR RESPONSE - PURE JSON ONLY:
==================

CRITICAL: Your response must be PURE JSON with NO markdown formatting.

DO NOT USE CODE BLOCKS:
❌ WRONG: \`\`\`json { ... } \`\`\`
✅ CORRECT: { ... }

Your response must:
- Start with {
- End with }
- Contain no text before or after the JSON
- Be valid, parseable JSON

Respond now with the JSON object:`;

  return {
    fullPrompt,
    existingImages
  };
}
