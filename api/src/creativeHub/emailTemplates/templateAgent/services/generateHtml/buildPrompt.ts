/**
 * Build Prompt for HTML Generation
 *
 * Compiles the full prompt for Claude including:
 * - Base system prompt with HTML generation guidelines
 * - Image usage guidelines
 * - Existing template images context
 * - Chat history context
 * - HTML generation specifications
 */

import { BASE_PROMPT, IMAGE_USAGE_GUIDELINES } from './promptEngineering';
import { TemplateImage } from '../../tools/fetchCurrentTemplateImages';
import { EmailTemplate } from '../../tools/fetchCurrentTemplate';
import { Message } from '../chats';

export interface BuildPromptInput {
  htmlParameters: Record<string, any>;
  existingImages: TemplateImage[];
  chatHistory: Message[];
  currentTemplate: EmailTemplate;
}

export interface BuildPromptOutput {
  fullPrompt: string;
  existingImages: TemplateImage[];
}

/**
 * Build the complete prompt for HTML generation
 *
 * @param input - HTML parameters, images, and chat history
 * @returns Complete prompt string and existing images
 */
export async function buildPrompt(input: BuildPromptInput): Promise<BuildPromptOutput> {
  const { htmlParameters, existingImages, chatHistory, currentTemplate } = input;

  console.log('[HTML Build Prompt] Building prompt...');
  console.log('[HTML Build Prompt] Template:', currentTemplate.name);
  console.log('[HTML Build Prompt] Existing images:', existingImages.length);
  console.log('[HTML Build Prompt] Chat history messages:', chatHistory.length);

  try {
    // Build current template context section
    const hasExistingHtml = currentTemplate.htmlContent && currentTemplate.htmlContent.length > 0;

    const templateContextSection = `
==================
CURRENT TEMPLATE:
==================

Template Name: ${currentTemplate.name}
Status: ${currentTemplate.status}
Original Template Goal: ${currentTemplate.aiPrompt || 'As specified in conversation'}

Existing HTML: ${hasExistingHtml ? `Yes (${currentTemplate.htmlContent.length} characters)` : 'No - creating new template'}

${hasExistingHtml ? `
🚨🚨🚨 CRITICAL: You are UPDATING existing HTML content.

Full current HTML (THIS IS THE STARTING POINT):
${currentTemplate.htmlContent}

🚨 ABSOLUTELY CRITICAL INSTRUCTION:
You MUST return the COMPLETE FULL HTML template in your response.
Even if the user asks for a tiny change (one color, one word, one image), you MUST:
1. Take the HTML above as your starting point
2. Make the requested modifications
3. Return the ENTIRE updated HTML from <!DOCTYPE html> to </html>

DO NOT return just the changed section. DO NOT return a snippet.
ALWAYS return the COMPLETE updated HTML template.

Consider whether the user wants to:
- Completely replace the existing HTML
- Update/modify specific sections (BUT STILL RETURN FULL HTML)
- Add new sections to existing content (BUT STILL RETURN FULL HTML)

REMEMBER: Your response must contain the ENTIRE HTML template, not a partial snippet.
` : `
IMPORTANT: You are CREATING brand new HTML from scratch.
You MUST return the COMPLETE FULL HTML template from <!DOCTYPE html> to </html>.
`}
`;

    // Build chat history context section
    let chatHistorySection = '';
    if (chatHistory.length > 0) {
      chatHistorySection = `
==================
CONVERSATION HISTORY:
==================

Here is the conversation history for context:

${chatHistory
  .map(
    (msg, idx) => `
Message ${idx + 1} [${msg.role}]:
${msg.content}
`
  )
  .join('\n')}

This history provides context about the template development so far.

`;
    }

    // Build existing images context section
    let imagesContextSection = '';
    if (existingImages.length > 0) {
      imagesContextSection = `
==================
EXISTING TEMPLATE IMAGES:
==================

You have access to ${existingImages.length} image(s) that have been generated for this template:

${existingImages
  .map(
    (img, idx) => `
Image ${idx + 1}:
  - URL: ${img.url}
  - Purpose: ${img.purpose || 'Not specified'}
  - Dimensions: ${img.dimensions || 'Not specified'}
  - Style: ${img.style || 'Not specified'}
`
  )
  .join('\n')}

CRITICAL:
- Use these image URLs directly in your HTML <img> tags
- Do NOT use placeholder URLs or generate fake URLs
- Match the image purpose to the appropriate section of the template
- Include proper alt text based on the image purpose

`;
    }

    // Build HTML specifications section
    const specificationsSection = `
==================
HTML GENERATION SPECIFICATIONS:
==================

You have been asked to generate HTML based on the following specifications:

${JSON.stringify(htmlParameters, null, 2)}

Key Requirements:
- Structure: ${htmlParameters.structure || 'Standard email layout'}
- Content: ${htmlParameters.content || 'As specified above'}
- Styling: ${htmlParameters.styling || 'Professional and clean design'}
- Responsive: ${htmlParameters.responsive || 'true'}

Follow these specifications closely while applying email HTML best practices.

`;

    // Compile full prompt
    const fullPrompt = `${BASE_PROMPT}

${IMAGE_USAGE_GUIDELINES}

${templateContextSection}

${imagesContextSection}

${chatHistorySection}

${specificationsSection}

Now, generate the complete HTML email template based on the specifications above.
Remember: Respond with ONLY valid JSON in the format:
{
  "assistantMessage": "Your friendly message here",
  "html": "Complete HTML code here"
}

No markdown, no code blocks, just pure JSON.`;

    console.log('[HTML Build Prompt]  Prompt built successfully');
    console.log('[HTML Build Prompt] Total prompt length:', fullPrompt.length, 'characters');

    return {
      fullPrompt,
      existingImages
    };
  } catch (error) {
    console.error('[HTML Build Prompt] L Error building prompt:', error);
    throw new Error(
      `Failed to build HTML generation prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
